const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

const createHeading = (text, level = HeadingLevel.HEADING_1) => {
    return new Paragraph({
        text: text,
        heading: level,
        spacing: { before: 400, after: 200 },
    });
};

const createSubHeading = (text) => createHeading(text, HeadingLevel.HEADING_2);

const createNormalText = (text) => {
    return new Paragraph({
        children: [
            new TextRun({
                text: text,
                size: 24, // 12pt
            }),
        ],
        spacing: { after: 150 },
    });
};

const createBoldText = (text) => {
    return new Paragraph({
        children: [
            new TextRun({
                text: text,
                bold: true,
                size: 24,
            }),
        ],
        spacing: { after: 150 },
    });
};

const createBulletPoint = (text) => {
    return new Paragraph({
        children: [
            new TextRun({
                text: text,
                size: 24,
            }),
        ],
        bullet: {
            level: 0,
        },
        spacing: { after: 100 },
    });
};

const createPlaceholder = (text) => {
    return new Paragraph({
        children: [
            new TextRun({
                text: `\n[ ${text} ]\n`,
                bold: true,
                color: "808080", // Gray
                size: 24,
            }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 300 },
    });
};

const doc = new Document({
    creator: "ITIL CASNOS System",
    title: "Guide d'Utilisation - Processus de Gestion des Changements",
    description: "Guide décrivant le processus ITIL et les rôles des différents acteurs.",
    sections: [
        {
            properties: {},
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "GUIDE D'UTILISATION - PLATEFORME ITIL CASNOS",
                            bold: true,
                            size: 36, // 18pt
                            color: "2563EB", // Blue
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                }),
                createHeading("Le Processus de Gestion des Changements (ITIL)", HeadingLevel.HEADING_1),
                createNormalText("La gestion des changements au sein de la plateforme ITIL CASNOS suit un processus standardisé garantissant que chaque modification apportée à l'infrastructure informatique est évaluée, planifiée, testée et approuvée de manière sécurisée. Ce processus minimise les risques d'interruption de service."),
                createNormalText("L'ordre d'intervention des différents acteurs dans le cycle de vie d'un changement est le suivant :"),
                createBulletPoint("1. Demandeur : Initie la Demande de Changement (RFC)."),
                createBulletPoint("2. Service Desk : Vérifie, qualifie et catégorise la demande initiale."),
                createBulletPoint("3. Change Manager : Évalue l'impact, planifie et gère la RFC à travers toutes les étapes."),
                createBulletPoint("4. CAB (Comité Consultatif) : Évalue les risques et vote l'approbation ou le rejet."),
                createBulletPoint("5. Implémenteur : Exécute techniquement le changement sur le terrain."),
                createBulletPoint("6. Administrateur : Garantit le bon fonctionnement global et configure les accès."),
                createPlaceholder("CAPTURE D'ÉCRAN : Schéma global du workflow (Optionnel)"),

                // 1. DEMANDEUR
                createHeading("1. L'Acteur : Demandeur", HeadingLevel.HEADING_1),
                createNormalText("Le Demandeur est le point de départ du processus. Il constate un besoin (nouvelle fonctionnalité, correction, amélioration) et soumet une Demande de Changement (RFC)."),
                createSubHeading("Pages et Fonctionnalités :"),
                createBulletPoint("Tableau de Bord : Permet au demandeur de voir le résumé de ses demandes en cours."),
                createPlaceholder("CAPTURE D'ÉCRAN : Tableau de Bord Demandeur"),
                createBulletPoint("Création de RFC : Formulaire permettant de décrire le besoin, de justifier le changement et de l'envoyer au Service Desk."),
                createPlaceholder("CAPTURE D'ÉCRAN : Formulaire de Création RFC"),
                createBulletPoint("Historique : Permet au demandeur de suivre l'avancement de ses propres RFC en temps réel (Statut, Décisions)."),

                // 2. SERVICE DESK
                createHeading("2. L'Acteur : Service Desk", HeadingLevel.HEADING_1),
                createNormalText("Le Service Desk agit comme le premier filtre. Il s'assure que la demande est complète et compréhensible avant de la transmettre à l'équipe de gestion."),
                createSubHeading("Pages et Fonctionnalités :"),
                createBulletPoint("Inquiry Hub (Boîte de Réception) : Liste des nouvelles RFC soumises."),
                createPlaceholder("CAPTURE D'ÉCRAN : Interface Inquiry Hub (Service Desk)"),
                createBulletPoint("Qualification : Le Service Desk vérifie les informations, effectue une première catégorisation de la priorité et du type, puis transfère la RFC au Change Manager."),
                createPlaceholder("CAPTURE D'ÉCRAN : Transfert et Qualification d'une RFC"),
                createBulletPoint("Broadcaster : Outil de communication permettant d'envoyer des notifications ou des messages de maintenance."),

                // 3. CHANGE MANAGER
                createHeading("3. L'Acteur : Change Manager", HeadingLevel.HEADING_1),
                createNormalText("Le Change Manager est le chef d'orchestre du processus. Il analyse l'impact, détermine si le changement nécessite le CAB, construit le planning et supervise la réalisation globale."),
                createSubHeading("Pages et Fonctionnalités :"),
                createBulletPoint("Dashboard : KPI globaux, RFCs en attente d'évaluation, changements planifiés."),
                createPlaceholder("CAPTURE D'ÉCRAN : Dashboard Change Manager"),
                createBulletPoint("Gestion des RFCs : Le manager examine la RFC qualifiée, réalise une évaluation d'impact préliminaire et décide du chemin d'approbation (Standard, Normal, Urgent)."),
                createPlaceholder("CAPTURE D'ÉCRAN : Évaluation d'impact d'une RFC"),
                createBulletPoint("Gestion des Changements & Tâches : Une fois la RFC validée, il crée le 'Changement' technique et assigne les tâches aux Implémenteurs."),
                createPlaceholder("CAPTURE D'ÉCRAN : Création et assignation de Tâches Techniques"),
                createBulletPoint("Planification : Calendrier visuel pour éviter les conflits et définir les fenêtres de 'Blackout' (périodes d'interdiction de changements)."),
                createPlaceholder("CAPTURE D'ÉCRAN : Calendrier de Planification (Blackout)"),

                // 4. CAB
                createHeading("4. L'Acteur : CAB (Comité Consultatif sur les Changements)", HeadingLevel.HEADING_1),
                createNormalText("Pour les changements majeurs ou présentant un risque élevé, l'approbation du CAB est requise. Les membres du CAB se réunissent (virtuellement ou physiquement) pour évaluer la sécurité et l'impact."),
                createSubHeading("Pages et Fonctionnalités :"),
                createBulletPoint("Espace CAB : Tableau de bord résumant les sessions de comité auxquelles l'utilisateur est convié."),
                createPlaceholder("CAPTURE D'ÉCRAN : Cockpit CAB / Sessions Urgentes"),
                createBulletPoint("Réunions et Votes : Lors d'une réunion, le membre du CAB consulte les détails de la RFC, formule des recommandations (conditions, précautions, rollback) et vote (Approuver ou Rejeter)."),
                createPlaceholder("CAPTURE D'ÉCRAN : Interface de Vote et Recommandations CAB"),

                // 5. IMPLEMENTEUR
                createHeading("5. L'Acteur : Implémenteur", HeadingLevel.HEADING_1),
                createNormalText("L'implémenteur est le technicien ou l'ingénieur chargé de réaliser le changement technique sur l'infrastructure selon le planning approuvé."),
                createSubHeading("Pages et Fonctionnalités :"),
                createBulletPoint("Mes Tâches : Liste des tâches assignées (En attente, En cours, Terminées)."),
                createPlaceholder("CAPTURE D'ÉCRAN : Liste des Tâches Implémenteur"),
                createBulletPoint("Exécution et Rapport : Le technicien met à jour le statut de sa tâche et, une fois terminée, soumet un rapport d'exécution détaillant ce qui a été fait (Succès, Échec, Rollback)."),
                createPlaceholder("CAPTURE D'ÉCRAN : Formulaire de Rapport d'Exécution"),
                
                // 6. ADMINISTRATEUR
                createHeading("6. L'Acteur : Administrateur Système", HeadingLevel.HEADING_1),
                createNormalText("L'administrateur a une vision à 360° de la plateforme. Il ne participe pas nécessairement à l'exécution d'un changement précis, mais il configure l'environnement, gère les habilitations et s'assure du maintien en condition opérationnelle du système ITIL."),
                createSubHeading("Rôles et Permissions :"),
                createNormalText("L'administrateur possède les privilèges maximums : Création, modification, suppression globale sur toutes les entités de l'application (Super Admin)."),
                createSubHeading("Pages et Fonctionnalités :"),
                createBulletPoint("Vue Globale (Monitoring) : Superviser les KPI de tous les modules (RFC, CAB, Tâches). L'administrateur peut intervenir en cas de blocage."),
                createPlaceholder("CAPTURE D'ÉCRAN : Dashboard Administrateur (Monitoring Global)"),
                createBulletPoint("Gestion des Utilisateurs : Ajouter, modifier, suspendre des comptes utilisateurs. Affectation des rôles (ex: transformer un demandeur en implémenteur)."),
                createPlaceholder("CAPTURE D'ÉCRAN : Gestion des Utilisateurs et Habilitations"),
                createBulletPoint("Gestion des Directions : Structure organisationnelle (Départements, Services)."),
                createPlaceholder("CAPTURE D'ÉCRAN : Gestion des Directions"),
                createBulletPoint("Gestion des CIs (Configuration Items) : Base de données des actifs informatiques (Serveurs, Logiciels, Réseaux) qui peuvent être impactés par un changement."),
                createPlaceholder("CAPTURE D'ÉCRAN : Gestion des Éléments de Configuration (CI)"),
                createBulletPoint("Journaux d'Audit (Audit Log) : Traçabilité totale. Voir qui a fait quoi et quand (sécurité et conformité)."),
                createPlaceholder("CAPTURE D'ÉCRAN : Journaux d'Audit Système"),
                createBulletPoint("Rapports & Statistiques : Générer des extractions PDF/Excel de l'activité globale pour le management."),
                createPlaceholder("CAPTURE D'ÉCRAN : Interface de Génération de Rapports"),

                // Conclusion
                createHeading("Conclusion", HeadingLevel.HEADING_1),
                createNormalText("Grâce à cette séquence rigoureuse (Demandeur -> Service Desk -> Change Manager -> CAB -> Implémenteur), appuyée par le contrôle de l'Administrateur, la plateforme garantit une livraison de changements fluide, documentée et sécurisée.")
            ],
        },
    ],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("Guide_Utilisation_Processus_ITIL_V3.docx", buffer);
    console.log("Document généré avec succès : Guide_Utilisation_Processus_ITIL_V3.docx");
}).catch(console.error);
