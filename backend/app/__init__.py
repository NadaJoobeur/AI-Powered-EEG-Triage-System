from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "mysql://root:@localhost/epilepsy_db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = "your_secret_key"

    CORS(app)  # Autoriser les requêtes cross-origin
    db.init_app(app)

    with app.app_context():
        from .auth.routes import auth_bp
        app.register_blueprint(auth_bp, url_prefix="/auth")

        db.create_all()  # Créer les tables de la base de données

    return app