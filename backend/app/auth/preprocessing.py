import mne
from sklearn.preprocessing import MinMaxScaler
import numpy as np
import math
def load_eeg(file_path: str) -> mne.io.Raw:
    """Charge le fichier .edf et le retourne sous forme d'objet MNE Raw."""
    raw = mne.io.read_raw_edf(file_path, preload=false)
    return raw
def apply_notch_filter(raw: mne.io.Raw, freq: float = 50) -> mne.io.Raw:
    """Applique un filtre notch pour éliminer le bruit de ligne à une fréquence donnée."""
    raw.notch_filter(freqs=freq)
    return raw

def normalize_eeg(raw: mne.io.Raw) -> mne.io.Raw:
    """Applique une normalisation Min-Max sur les données EEG pour chaque canal."""
    scaler = MinMaxScaler()
    data = raw.get_data()
    normalized_data = scaler.fit_transform(data.T).T  # Transposer pour appliquer Min-Max par canal
    raw._data = normalized_data  # Appliquer la normalisation sur les données de raw
    return raw

def segment_eeg(raw: mne.io.Raw, segment_duration: int = 5) -> list:
    """Découpe les données EEG en segments de durée donnée (en secondes)."""
    segment_length = int(segment_duration * raw.info['sfreq'])  # Durée en échantillons
    num_segments = math.ceil(len(raw.times) / segment_length)  # Nombre de segments arrondi

    segments = []
    for i in range(num_segments):
        start = i * segment_length
        end = start + segment_length

        # Ajuster end pour ne pas dépasser la durée maximale du fichier
        if end > len(raw.times):
            end = len(raw.times)

        # Calculer tmin et tmax en secondes
        tmin = start / raw.info['sfreq']
        tmax = end / raw.info['sfreq']

        # Assurez-vous que tmax ne dépasse pas la durée maximale des données
        if tmax > raw.times[-1]:
            tmax = raw.times[-1]  # Fixer tmax à la fin des données

        if tmin < tmax:
            segment = raw.copy().crop(tmin=tmin, tmax=tmax)
            segments.append(segment)
    
    return segments


def remove_artifacts(segments: list) -> list:
    """
    Applique l'ICA pour supprimer les artefacts de chaque segment EEG.

    Args:
        segments (list): Une liste de segments EEG (chaque segment est un numpy.ndarray).

    Returns:
        list: Une liste de segments EEG après suppression des artefacts.
    """
    cleaned_segments = []

    for segment in segments:
        # Convertir le segment en un objet RawArray
        info = mne.create_info(
            ch_names=["CH{}".format(i + 1) for i in range(segment.shape[0])],  # Noms des canaux
            sfreq=256,  # Fréquence d'échantillonnage (à adapter selon vos données)
            ch_types="eeg",  # Type de canal (EEG)
        )
        raw_segment = mne.io.RawArray(segment, info)

        # Appliquer ICA
        ica = mne.preprocessing.ICA(n_components=20, random_state=97, max_iter=800)
        ica.fit(raw_segment)
        cleaned_raw_segment = ica.apply(raw_segment)

        # Extraire les données du segment nettoyé
        cleaned_segment = cleaned_raw_segment.get_data()
        cleaned_segments.append(cleaned_segment)

    return cleaned_segments