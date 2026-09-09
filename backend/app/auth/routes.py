from flask import Blueprint, request, jsonify,session
from app.models.user import User
from app import db
import mne
import numpy as np
import os  
import warnings
from .preprocessing import load_eeg, apply_notch_filter, normalize_eeg, segment_eeg, remove_artifacts
from tempfile import NamedTemporaryFile
from sklearn.preprocessing import MinMaxScaler
import math
import time
from datetime import datetime,timezone
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from scipy.signal import welch
from scipy.linalg import svd
from scipy.stats import entropy
auth_bp = Blueprint("auth", __name__)
segments = []

#############################################################
###                     Authentificatin                   ###
############################################################# 
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    name=data.get("name")
    email = data.get("email")
    password = data.get("password")

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "User already exists"}), 400

    new_user = User(email=email,name=name)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User created successfully"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401

    return jsonify({'status': 'success', 'userName': user.name}), 200

#############################################################
###                     Importationn                      ###
############################################################# 

@auth_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename.endswith('.edf'):
        file_path = f"temp/{file.filename}"
        try:
            # Créer le dossier 'temp' s'il n'existe pas
            if not os.path.exists('temp'):
                os.makedirs('temp')
            
            # Sauvegarder le fichier temporairement
            file.save(file_path)
            print(f" Fichier enregistré à {file_path}")

            # Lire le fichier EDF
            raw = mne.io.read_raw_edf(file_path, preload=True)
            data, times = raw[:, :]
            print(f" Données EDF chargées avec succès : {len(data)} échantillons")

            # Convertir les données en format JSON
            signals = {
                "times": times[:100].tolist(),  # Envoie seulement les 100 premiers points pour tester
                "data": data[:,:100].tolist(),
                "channels": raw.ch_names,
                "sfreq": raw.info["sfreq"],
                "nchan": raw.info["nchan"],  # Nombre de canaux
                "highpass": raw.info["highpass"],  # Fréquence de coupure haute
                "lowpass": raw.info["lowpass"],  # Fréquence de coupure basse
            }

            print(" Envoi du JSON de réponse")
            return jsonify(signals)
        
        except Exception as e:
            print(f" Erreur lors du traitement : {str(e)}")
            return jsonify({"error": f"Failed to process the EDF file: {str(e)}"}), 500
        
    
    else:
        return jsonify({"error": "Invalid file type. Please upload an EDF file."}), 400
    
#############################################################
###                    PreProcessing                      ###
############################################################# 

@auth_bp.route("/preprocess", methods=["POST"])
def preprocess():
    global segments 
    data = request.json
    file_path = data.get("file_path")
    
    # Charger le fichier .edf
    raw = mne.io.read_raw_edf(file_path, preload=True)

    # 1️⃣ Appliquer un filtre notch pour éliminer le bruit de ligne à 50 Hz
    raw.notch_filter(freqs=50)

    # 2️⃣ Normalisation Min-Max via apply_function()
    def min_max_normalize(data):
        scaler = MinMaxScaler()
        if data.ndim == 1:  # Si un seul canal (1D), on reshape en 2D
            data = data.reshape(-1, 1)
            normalized_data = scaler.fit_transform(data).flatten()  # Remettre en 1D après normalisation
        else:
            normalized_data = scaler.fit_transform(data.T).T  # Transposer pour normaliser par canal
        return normalized_data

    raw.apply_function(min_max_normalize, picks="all")

    # 3️⃣ Découper les données en segments de 5 secondes
    segment_length = int(5 * raw.info['sfreq'])  # 5 secondes en échantillons
    num_segments = math.ceil(len(raw.times) / segment_length)  # Nombre de segments arrondi

    
    for i in range(num_segments):
        start = i * segment_length
        end = min(start + segment_length, len(raw.times))  # Ne pas dépasser la fin

        tmin = start / raw.info['sfreq']
        tmax = end / raw.info['sfreq']

        # Ajuster tmax pour ne pas dépasser la durée maximale
        if tmax > raw.times[-1]:
            tmax = raw.times[-1]
        if tmin < tmax:
            segment = raw.copy().crop(tmin=tmin, tmax=tmax)
            # 4️⃣ Suppression des artefacts par ICA sur chaque segment
            ica = mne.preprocessing.ICA(n_components=20, random_state=97, max_iter=800)
            ica.fit(segment)
            ica.exclude = []  # Définir les composants à exclure si nécessaire
            segment = ica.apply(segment)
            # Ajouter le segment prétraité à la liste
            segments.append(segment)
    return jsonify({"message": "done"}), 200


#############################################################
###                     Extraction de features            ###
############################################################# 


### 📌 Fonctions pour calculer les caractéristiques
def compute_dfa(data):
    """Calcul du Detrended Fluctuation Analysis (DFA)."""
    return np.mean(np.abs(np.diff(data)))

def compute_fisher_information(data):
    """Calcul de l'Information de Fisher."""
    psd, _ = welch(data)
    return np.sum(psd ** 2) / np.sum(psd)

def compute_hfd(data):
    """Calcul de la Dimension Fractale de Higuchi (HFD)."""
    return np.mean(np.abs(np.diff(data)))  # Approximation

def compute_pfd(data):
    """Calcul de la Dimension Fractale de Petrosian (PFD)."""
    N = len(data)
    zero_crossings = np.count_nonzero(np.diff(np.sign(data)))
    return math.log(N) / (math.log(N) + math.log(N / (N + 0.4 * zero_crossings)))

def compute_svd_entropy(data):
    """Calcul de l'Entropie SVD."""
    U, S, V = svd(data, full_matrices=False)
    S_norm = S / np.sum(S)
    return entropy(S_norm)

def compute_complexity(data):
    """Calcul de la complexité (par exemple, Entropie de permutation)."""
    return np.std(np.diff(data))

@auth_bp.route("/extract", methods=["POST"])
def extract_features_from_segments():
    global segments
    preprocessed_data = segments
    """
    Extraction des caractéristiques pour chaque segment, puis regroupement des 2 meilleurs canaux par segment
    dans un fichier CSV unique sans la colonne segment_id.
    """
    # Dictionnaire pour stocker les caractéristiques de chaque segment
    features_list = []
    
    try:
        # Parcourir chaque segment dans les données prétraitées
        for idx, segment in enumerate(preprocessed_data):
            # Initialiser une liste pour stocker les caractéristiques de chaque canal
            channel_features = []

            # Parcourir les canaux et extraire les caractéristiques
            for channel in segment.info['ch_names']:
                data, _ = segment[channel, :]

                # Normalisation Min-Max
                scaler = MinMaxScaler()
                data = scaler.fit_transform(data.T).T  # Normalisation

                # Calculer les caractéristiques
                dfa = compute_dfa(data)
                fisher_info = compute_fisher_information(data)
                hfd = compute_hfd(data)
                pfd = compute_pfd(data)
                svd_entropy = compute_svd_entropy(data)
                variance = np.var(data)
                std_dev = np.std(data)
                mean = np.mean(data)
                fft_variance = np.var(np.fft.fft(data))
                fft_std_dev = np.std(np.fft.fft(data))
                fft2_variance = np.var(np.fft.fft2(data))
                zero_crossings = np.count_nonzero(np.diff(np.sign(data)))
                complexity = compute_complexity(data)

                # Ajouter les caractéristiques dans la liste
                channel_features.append({
                    'channel_name': channel,
                    'DFA': dfa,
                    'Fisher_Information': fisher_info,
                    'HFD': hfd,
                    'PFD': pfd,
                    'SVD_Entropy': svd_entropy,
                    'variance': variance,
                    'std_deviation': std_dev,
                    'mean': mean,
                    'fft_variance': fft_variance,
                    'fft_std_deviation': fft_std_dev,
                    'fft2_variance': fft2_variance,
                    'zero_crossing_rate': zero_crossings,
                    'complexity': complexity
                })

            # Trier les canaux par DFA et prendre les deux meilleurs
            best_channels = sorted(channel_features, key=lambda x: x['DFA'], reverse=True)[:2]

            # Si deux meilleurs canaux sont trouvés, on les combine dans une seule ligne
            if len(best_channels) == 2:
                features_list.append({
                    **{f'DFA_channel1': best_channels[0]['DFA'], 'Fisher_Information_channel1': best_channels[0]['Fisher_Information'], 'HFD_channel1': best_channels[0]['HFD'], 'PFD_channel1': best_channels[0]['PFD'], 'SVD_Entropy_channel1': best_channels[0]['SVD_Entropy'], 'variance_channel1': best_channels[0]['variance'], 'std_deviation_channel1': best_channels[0]['std_deviation'], 'mean_channel1': best_channels[0]['mean'], 'fft_variance_channel1': best_channels[0]['fft_variance'], 'fft_std_deviation_channel1': best_channels[0]['fft_std_deviation'], 'fft2_variance_channel1': best_channels[0]['fft2_variance'], 'zero_crossing_rate_channel1': best_channels[0]['zero_crossing_rate'], 'complexity_channel1': best_channels[0]['complexity']},
                    **{f'DFA_channel2': best_channels[1]['DFA'], 'Fisher_Information_channel2': best_channels[1]['Fisher_Information'], 'HFD_channel2': best_channels[1]['HFD'], 'PFD_channel2': best_channels[1]['PFD'], 'SVD_Entropy_channel2': best_channels[1]['SVD_Entropy'], 'variance_channel2': best_channels[1]['variance'], 'std_deviation_channel2': best_channels[1]['std_deviation'], 'mean_channel2': best_channels[1]['mean'], 'fft_variance_channel2': best_channels[1]['fft_variance'], 'fft_std_deviation_channel2': best_channels[1]['fft_std_deviation'], 'fft2_variance_channel2': best_channels[1]['fft2_variance'], 'zero_crossing_rate_channel2': best_channels[1]['zero_crossing_rate'], 'complexity_channel2': best_channels[1]['complexity']},
                })

        # Convertir la liste en DataFrame
        df = pd.DataFrame(features_list)
        output_dir = "extract"
        # Enregistrer dans un fichier CSV unique
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        file_name = os.path.join(output_dir, "best_channels_features.csv")
        df.to_csv(file_name, index=False, mode='w')

        print(f"✅ Caractéristiques enregistrées dans {file_name}")
        # Charger le CSV pour obtenir des informations sur le fichier
        csv_df = pd.read_csv(file_name)
        rows = csv_df.to_dict(orient="records")  # Retourne toutes les lignes
        num_rows, num_cols = csv_df.shape
        print(num_rows, num_cols)
        # Créer une description du fichier
        file_description = {
            "file_name": file_name,
            "num_rows": num_rows,
            "num_columns": num_cols,
            "columns": csv_df.columns.tolist(),
        }

        print(f"✅ Caractéristiques enregistrées dans {file_name}")
        
        # Retourner les 10 premières lignes et la description du fichier
        return jsonify({
        "message": "done",
        "all_rows": rows,
        "file_description": file_description
    }), 200

    except Exception as e:
        print(f"❌ Erreur lors de l'extraction des caractéristiques: {str(e)}")
        return jsonify({"error": f"Une erreur s'est produite: {str(e)}"}), 500

#############################################################
###                     Prediction                        ###
#############################################################  
import onnxruntime as ort

sessions = [ort.InferenceSession(f"modelsMl/model_{i}.onnx") for i in range(4)]
meta_session = ort.InferenceSession("modelsMl/meta_model.onnx")


@auth_bp.route('/predict', methods=['POST'])
def predict():
    file = r"extract\best_channels_features.csv"
    
    df = pd.read_csv(file)
    predictions_list = []

    for index, row in df.iterrows():
        # Convertir la ligne en tableau numpy (assurez-vous que le modèle accepte bien les données sous cette forme)
        X_new = row.values.astype(np.float32).reshape(1, -1)

        # Générer les prédictions des modèles de base
        base_predictions_test = np.zeros((X_new.shape[0], len(sessions)), dtype=np.float32)
        
        for i, session in enumerate(sessions):
            predictions = session.run(None, {"float_input": X_new})[0]
            print(f"Predictions from model {i}: {predictions}")  # Afficher la sortie pour chaque modèle
            
            if predictions.ndim == 1:
                base_predictions_test[:, i] = predictions
            else:
                base_predictions_test[:, i] = predictions[:, 1]

        base_predictions_test = base_predictions_test.astype(np.float32)

        # Prédiction finale avec le méta-modèle
        final_predictions = meta_session.run(None, {"float_input": base_predictions_test})[0]
        
        print(f"Final predictions for row {index}: {final_predictions}")  # Afficher les prédictions finales

        # Ajouter les prédictions à la liste
        predictions_list.append(final_predictions.tolist())

    # Retourner les prédictions sous forme de réponse JSON
    return jsonify({"predictions": predictions_list})
###############################################################
###                     chatBot                             ###
###############################################################
from flask import Blueprint, request, jsonify
import requests  # Importation du module requests

# Remplace par ta clé API OpenAI
API_KEY = "sk-812ad0c298c440c88676dfe1b9bc76e3"
@auth_bp.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get("message")

        if not user_message:
            return jsonify({"error": "Message is required"}), 400

        # Requête à l'API DeepSeek
        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": user_message}]
            }
        )

        # Vérifier le statut de la réponse
        if response.status_code != 200:
            error_message = response.json().get("error", {}).get("message", "API request failed")
            print(f"Erreur API: {response.status_code}, {error_message}")
            return jsonify({"error": error_message}), response.status_code

        # Extraire la réponse du bot
        response_data = response.json()
        if 'choices' not in response_data or not response_data['choices']:
            return jsonify({"error": "Invalid response from API"}), 500

        bot_message = response_data['choices'][0]['message']['content']
        return jsonify({"content": bot_message})

    except requests.exceptions.RequestException as e:
        print(f"Erreur de requête : {e}")
        return jsonify({"error": "Failed to connect to API"}), 500
    except Exception as e:
        print(f"Erreur interne : {e}")
        return jsonify({"error": "Internal Server Error"}), 500
    