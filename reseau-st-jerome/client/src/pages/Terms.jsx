import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <main className="auth wide">
      <h1>Conditions d’utilisation</h1>
      <p className="muted">Version provisoire, à compléter et à faire valider par l’équipe et l’établissement.</p>
      <div className="card prose">
        <h2>1. Réservé aux étudiants</h2>
        <p>Ce réseau est réservé aux étudiants de Saint Jérôme. Chaque compte est personnel : ne partagez pas votre mot de passe.</p>
        <h2>2. Respect des autres</h2>
        <p>Le harcèlement, les insultes, les menaces, les contenus discriminatoires ou sexuels et la diffusion d’informations privées sont interdits.</p>
        <h2>3. Contenus</h2>
        <p>Vous êtes responsable de ce que vous publiez. Ne publiez rien d’illégal et ne reprenez pas le travail d’autrui sans son accord.</p>
        <h2>4. Modération</h2>
        <p>Les modérateurs peuvent masquer un contenu ou suspendre un compte en cas de non-respect de ces règles : avertissement, suspension, puis exclusion.</p>
        <h2>5. Données personnelles</h2>
        <p>Nous collectons uniquement les informations nécessaires au fonctionnement du réseau (identité, e-mail institutionnel, publications). Vous pouvez demander l’accès à vos données, leur correction ou la suppression de votre compte, conformément à la loi n° 2024/017 du 23 décembre 2024.</p>
      </div>
      <p className="center"><Link to="/connexion">Retour</Link></p>
    </main>
  );
}
