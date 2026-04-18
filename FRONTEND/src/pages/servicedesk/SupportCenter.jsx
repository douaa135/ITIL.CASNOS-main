import React, { useState, useEffect } from 'react';
import { 
  FiBook, FiSearch, FiChevronRight, FiFileText, 
  FiHelpCircle, FiTool, FiMessageSquare
} from 'react-icons/fi';
import api from '../../api/axios';
import './SupportCenter.css';

const SupportCenter = () => {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuide, setSelectedGuide] = useState(null);

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    try {
      const res = await api.get('/changements'); // Using guides from changements or separate if exists
      // Simulate guide extraction from changements guides list
      if (res.success) {
        setGuides([
          { 
            id: '1', 
            titre: 'Procédure Rollback Oracle/Postgres', 
            categorie: 'Infrastructure', 
            contenu: 'En cas de corruption de données après une migration de schéma : 1. Arrêter les serveurs d\'application. 2. Exécuter /usr/local/bin/casnos_restore.sh <date>. 3. Valider l\'intégrité des index.' 
          },
          { 
            id: '2', 
            titre: 'Droit à l\'oubli (RGPD/CASNOS)', 
            categorie: 'Aide Utilisateur', 
            contenu: 'Procédure d\'anonymisation des dossiers assurés archivés. Nécessite l\'approbation de la Direction des Prestations avant exécution du script SQL de purge.' 
          },
          { 
            id: '3', 
            titre: 'Relance des services IIS/Web', 
            categorie: 'Maintenance', 
            contenu: 'Si le portail assuré renvoie une erreur 503 : 1. Ouvrir le gestionnaire IIS. 2. Vérifier le pool d\'application CASNOS_AppPool. 3. Recycler le pool si le statut est "Stopped".' 
          },
          { 
            id: '4', 
            titre: 'Configuration VPN Télétravail', 
            categorie: 'Réseau', 
            contenu: 'Paramètres IPsec pour les agents DMSI : Gateway: vpn.casnos.dz, Auth: Certificat + Token. En cas d\'échec de connexion, vérifier les logs FortiClient.' 
          },
          { 
            id: '5', 
            titre: 'Demande de matériel d\'urgence', 
            categorie: 'Logistique IT', 
            contenu: 'Procédure pour le Service Desk en cas de panne critique d\'un poste client en agence. Remplir le formulaire B-04 et transmettre au Change Manager pour approbation immédiate.' 
          }
        ]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filteredGuides = guides.filter(g => 
    g.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.categorie.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="support-center">
      <div className="support-sidebar">
        <div className="search-box">
          <FiSearch />
          <input 
            type="text" 
            placeholder="Rechercher un guide..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <nav className="guides-nav">
          <h3><FiBook /> Base de Support</h3>
          {loading ? (
            <p className="loading-txt">Indexation des scripts...</p>
          ) : (
            filteredGuides.map(guide => (
              <div 
                key={guide.id} 
                className={`guide-nav-item ${selectedGuide?.id === guide.id ? 'active' : ''}`}
                onClick={() => setSelectedGuide(guide)}
              >
                <div className="guide-icon"><FiFileText /></div>
                <div className="guide-info">
                   <strong>{guide.titre}</strong>
                   <span>{guide.categorie}</span>
                </div>
                <FiChevronRight className="arrow" />
              </div>
            ))
          )}
        </nav>
      </div>

      <div className="support-view">
        {selectedGuide ? (
          <div className="guide-content">
            <div className="guide-header">
               <span className="cat-badge">{selectedGuide.categorie}</span>
               <h2>{selectedGuide.titre}</h2>
               <div className="guide-meta">Dernière mise à jour: 12/04/2026 • Rédigé par DMSI</div>
            </div>
            <div className="guide-body">
               <div className="alert-box-blue">
                  <FiHelpCircle />
                  <p>Utilisez ce script uniquement en cas d'échec confirmé de l'implémentation.</p>
               </div>
               <div className="text-content">
                  <p>{selectedGuide.contenu}</p>
               </div>
               <div className="technical-steps">
                  <h4>Étapes de résolution</h4>
                  <div className="step-item">
                     <div className="step-num">1</div>
                     <p>Identifier le nœud serveur en erreur via le monitoring Dashboard.</p>
                  </div>
                  <div className="step-item">
                     <div className="step-num">2</div>
                     <p>Communiquer aux utilisateurs une interruption de 5 minutes via le <strong>Broadcaster</strong>.</p>
                  </div>
                  <div className="step-item">
                     <div className="step-num">3</div>
                     <p>Exécuter la commande de redémarrage des services impactés.</p>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="support-placeholder">
             <FiTool size={80} />
             <h3>Base de Connaissances Technique</h3>
             <p>Sélectionnez un script ou un guide à gauche pour voir les instructions détaillées de support.</p>
             <div className="help-options">
                <div className="opt">
                   <FiMessageSquare />
                   <strong>Besoin d'aide ?</strong>
                   <span>Contactez le Change Manager sur le canal d'urgence.</span>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportCenter;
