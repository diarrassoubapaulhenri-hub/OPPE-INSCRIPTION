// Données de stockage
let inscriptions = JSON.parse(localStorage.getItem('oppe_inscriptions_2026')) || [];
let personnels = JSON.parse(localStorage.getItem('oppe_personnels_2026')) || [
    {
        id: 1,
        nom: "Jean Dupont",
        code: "PER001",
        poste: "Responsable principal",
        telephone: "06 12 34 56 78",
        statut: "actif",
        commentaires: "Coordinateur OPPE",
        dateCreation: new Date().toISOString()
    },
    {
        id: 2,
        nom: "Marie Martin",
        code: "PER002",
        poste: "Responsable inscriptions",
        telephone: "06 23 45 67 89",
        statut: "actif",
        commentaires: "",
        dateCreation: new Date().toISOString()
    }
];
let currentEditId = null;
let currentEditPersonnelId = null;
let sessionTimer = 30 * 60;

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('isAuthenticated') !== 'true') {
        window.location.href = 'login.html';
        return;
    }
    
    initializeTabs();
    initializeForms();
    loadPersonnels();
    loadInscriptionsList();
    updateStatistics();
    initializeCharts();
    updateDatabaseInfo();
    startSessionTimer();
    
    // Événements pour l'âge
    document.getElementById('age').addEventListener('input', updateAgeCategory);
    
    // Événements pour le paiement
    document.querySelectorAll('input[name="montant"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('montantLibre').style.display = 
                this.value === 'autre' ? 'block' : 'none';
        });
    });
    
    // Événements pour le type d'inscripteur
    document.querySelectorAll('input[name="inscripteurType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const isExterne = this.value === 'externe';
            document.getElementById('externalInscripteur').style.display = 
                isExterne ? 'block' : 'none';
            document.getElementById('inscripteurId').readOnly = !isExterne;
            document.getElementById('inscripteurPoste').readOnly = !isExterne;
            
            if (!isExterne) {
                document.getElementById('inscripteurId').value = '';
                document.getElementById('inscripteurPoste').value = '';
            }
        });
    });
    
    // Recherche d'inscripteur
    document.getElementById('btnSearchInscripteur').addEventListener('click', searchPersonnel);
    document.getElementById('searchInscripteur').addEventListener('input', searchPersonnel);
    
    // Gestion des modals
    document.getElementById('editTshirt').addEventListener('change', function() {
        document.querySelector('.tshirt-details').style.display = 
            this.checked ? 'block' : 'none';
    });
    
    document.getElementById('editDateTshirt').value = new Date().toISOString().split('T')[0];
    
    // Déconnexion
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Changement mot de passe
    document.getElementById('changePasswordBtn').addEventListener('click', showPasswordModal);
    document.querySelector('.close-password').addEventListener('click', hidePasswordModal);
    document.getElementById('cancelPasswordBtn').addEventListener('click', hidePasswordModal);
    document.getElementById('savePasswordBtn').addEventListener('click', changePassword);
});

// ==================== GESTION DE SESSION ====================
function startSessionTimer() {
    const timerElement = document.getElementById('sessionTimer');
    
    const updateTimer = () => {
        const minutes = Math.floor(sessionTimer / 60);
        const seconds = sessionTimer % 60;
        
        timerElement.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (sessionTimer <= 0) {
            logout();
        } else {
            sessionTimer--;
            setTimeout(updateTimer, 1000);
        }
    };
    
    updateTimer();
}

function resetSessionTimer() {
    sessionTimer = 30 * 60;
}

function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        localStorage.removeItem('isAuthenticated');
        window.location.href = 'login.html';
    }
}

// ==================== GESTION DES ONGLETS ====================
function initializeTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(this.dataset.tab).classList.add('active');
            
            if (this.dataset.tab === 'liste') {
                loadInscriptionsList();
            } else if (this.dataset.tab === 'statistiques') {
                updateStatistics();
                updateCharts();
            } else if (this.dataset.tab === 'inscripteurs') {
                loadPersonnels();
            } else if (this.dataset.tab === 'export') {
                updateDatabaseInfo();
            }
            
            resetSessionTimer();
        });
    });
}

// ==================== GESTION DES FORMULAIRES ====================
function initializeForms() {
    // Formulaire d'inscription
    document.getElementById('formInscription').addEventListener('submit', function(e) {
        e.preventDefault();
        submitInscription();
    });
    
    // Formulaire de modification
    document.getElementById('formModification').addEventListener('submit', function(e) {
        e.preventDefault();
        updateInscription();
    });
    
    // Formulaire personnel
    document.getElementById('formPersonnel').addEventListener('submit', function(e) {
        e.preventDefault();
        addPersonnel();
    });
    
    // Formulaire modification personnel
    document.getElementById('formEditPersonnel').addEventListener('submit', function(e) {
        e.preventDefault();
        updatePersonnel();
    });
    
    // Recherche pour modification d'inscription - FONCTION CORRIGÉE
    document.getElementById('searchBtn').addEventListener('click', function() {
        searchInscription();
    });
    document.getElementById('searchModify').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchInscription();
    });
    
    // Annuler la modification
    document.getElementById('cancelEdit').addEventListener('click', function() {
        document.getElementById('editFormContainer').style.display = 'none';
        document.getElementById('searchModify').value = '';
    });
    
    // Supprimer une inscription
    document.getElementById('deleteBtn').addEventListener('click', deleteInscription);
    
    // Recherche dans la liste
    document.getElementById('searchInput').addEventListener('input', filterInscriptions);
    
    // Filtre par inscripteur
    document.getElementById('filterInscripteur').addEventListener('change', filterInscriptionsByPersonnel);
    
    // Exports
    document.getElementById('exportListBtn').addEventListener('click', exportToExcel);
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    document.getElementById('exportCSVBtn').addEventListener('click', exportToCSV);
    
    // Sauvegarde/Restauration
    document.getElementById('backupBtn').addEventListener('click', backupData);
    document.getElementById('restoreBtn').addEventListener('click', () => document.getElementById('restoreFile').click());
    document.getElementById('restoreFile').addEventListener('change', restoreData);
    
    // Rapports
    document.getElementById('reportBtn').addEventListener('click', generateReport);
    document.getElementById('printSummaryBtn').addEventListener('click', printSummary);
    
    // Maintenance
    document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
    document.getElementById('resetAppBtn').addEventListener('click', resetApplication);
    
    // Modal
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('nouvelleInscriptionBtn').addEventListener('click', function() {
        closeModal();
        document.querySelector('[data-tab="inscription"]').click();
    });
    document.getElementById('imprimerBtn').addEventListener('click', printRecap);
    
    // Modal personnel
    document.querySelector('.close-edit-personnel').addEventListener('click', hideEditPersonnelModal);
    document.getElementById('cancelEditPersonnel').addEventListener('click', hideEditPersonnelModal);
    document.getElementById('deletePersonnelBtn').addEventListener('click', deletePersonnelModal);
    
    // Recherche personnel
    document.getElementById('searchPersonnel').addEventListener('input', filterPersonnel);
    
    // Réinitialiser le timer sur toutes les interactions
    ['click', 'keypress', 'submit'].forEach(event => {
        document.addEventListener(event, resetSessionTimer);
    });
}

// ==================== FONCTIONS MANQUANTES - CORRECTIONS ====================

// Fonction de recherche d'inscription - FONCTION AJOUTÉE
function searchInscription() {
    const searchTerm = document.getElementById('searchModify').value.trim();
    
    if (!searchTerm) {
        alert('Veuillez entrer un nom ou un ID');
        return;
    }
    
    // Rechercher par ID ou nom
    const inscription = inscriptions.find(ins => 
        ins.id.toString() === searchTerm || 
        ins.nom.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (inscription) {
        currentEditId = inscription.id;
        loadInscriptionToForm(inscription);
        document.getElementById('editFormContainer').style.display = 'block';
    } else {
        alert('Aucune inscription trouvée');
    }
}

// Fonction pour mettre à jour les statistiques du personnel - FONCTION AJOUTÉE
function updatePersonnelStats() {
    const totalPersonnel = personnels.length;
    const personnelActifs = personnels.filter(p => p.statut === 'actif').length;
    
    // Compter les inscriptions par personnel
    let totalInscriptionsPersonnel = 0;
    let totalCollectePersonnel = 0;
    
    personnels.forEach(personnel => {
        const personnelInscriptions = inscriptions.filter(i => 
            i.inscripteur && i.inscripteur.code === personnel.code
        );
        totalInscriptionsPersonnel += personnelInscriptions.length;
        totalCollectePersonnel += personnelInscriptions.reduce((sum, ins) => sum + ins.montant, 0);
    });
    
    document.getElementById('totalPersonnel').textContent = totalPersonnel;
    document.getElementById('personnelActifs').textContent = personnelActifs;
    document.getElementById('totalInscriptionsPersonnel').textContent = totalInscriptionsPersonnel;
    document.getElementById('totalCollectePersonnel').textContent = `${totalCollectePersonnel.toLocaleString()} F`;
}

// ==================== GESTION DU PERSONNEL ====================

function editPersonnel(id) {
    console.log('Édition du personnel ID:', id);
    
    const personnel = personnels.find(p => p.id === id);
    if (!personnel) {
        alert('Membre non trouvé');
        return;
    }
    
    currentEditPersonnelId = id;
    
    // Remplir le formulaire
    document.getElementById('editPersonnelId').value = id;
    document.getElementById('editPersonnelNom').value = personnel.nom;
    document.getElementById('editPersonnelCode').value = personnel.code;
    document.getElementById('editPersonnelPoste').value = personnel.poste;
    document.getElementById('editPersonnelTelephone').value = personnel.telephone || '';
    document.getElementById('editPersonnelStatut').value = personnel.statut;
    document.getElementById('editPersonnelCommentaires').value = personnel.commentaires || '';
    
    // Afficher le modal - FORÇAGE DE L'AFFICHAGE
    const modal = document.getElementById('editPersonnelModal');
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '9999';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    
    console.log('Modal affiché avec succès');
}

// Fonction pour confirmer la suppression d'un personnel
function confirmDeletePersonnel(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre du personnel ?')) {
        return;
    }
    
    const personnel = personnels.find(p => p.id === id);
    if (!personnel) {
        alert('Membre non trouvé');
        return;
    }
    
    // Vérifier s'il a des inscriptions
    const inscriptionsPersonnel = inscriptions.filter(i => 
        i.inscripteur && i.inscripteur.code === personnel.code
    );
    
    if (inscriptionsPersonnel.length > 0) {
        if (!confirm(`Ce membre a ${inscriptionsPersonnel.length} inscription(s). Voulez-vous vraiment le supprimer ?`)) {
            return;
        }
    }
    
    deletePersonnelById(id);
}

// Fonction pour supprimer depuis le modal
function deletePersonnelModal() {
    const id = parseInt(document.getElementById('editPersonnelId').value);
    
    if (!id) {
        alert('ID du membre non trouvé');
        return;
    }
    
    confirmDeletePersonnel(id);
}

// Fonction utilitaire pour supprimer
function deletePersonnelById(id) {
    const index = personnels.findIndex(p => p.id === id);
    
    if (index === -1) {
        alert('Membre non trouvé');
        return;
    }
    
    personnels.splice(index, 1);
    savePersonnels();
    loadPersonnels();
    updatePersonnelStats();
    
    // Fermer le modal si ouvert
    hideEditPersonnelModal();
    
    alert('Membre du personnel supprimé avec succès !');
}
    
    // Fermer le modal si ouvert
    if (document.getElementById('editPersonnelModal').style.display === 'block') {
        hideEditPersonnelModal();
    }
    
    alert('Membre du personnel supprimé avec succès !');
}

// Fermer le modal d'édition
function hideEditPersonnelModal() {
    const modal = document.getElementById('editPersonnelModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    currentEditPersonnelId = null;
    document.getElementById('formEditPersonnel').reset();
    
    console.log('Modal fermé');
}

// Mettre à jour un personnel
function updatePersonnel() {
    const id = parseInt(document.getElementById('editPersonnelId').value);
    const index = personnels.findIndex(p => p.id === id);
    
    if (index === -1) {
        alert('Membre non trouvé');
        return;
    }
    
    const nom = document.getElementById('editPersonnelNom').value.trim();
    const code = document.getElementById('editPersonnelCode').value.trim();
    const poste = document.getElementById('editPersonnelPoste').value.trim();
    const telephone = document.getElementById('editPersonnelTelephone').value.trim();
    const statut = document.getElementById('editPersonnelStatut').value;
    const commentaires = document.getElementById('editPersonnelCommentaires').value.trim();
    
    if (!nom || !code || !poste) {
        alert('Veuillez remplir tous les champs obligatoires (Nom, Code, Poste)');
        return;
    }
    
    // Vérifier si le code existe déjà pour un autre personnel
    const autrePersonnel = personnels.find(p => p.code === code && p.id !== id);
    if (autrePersonnel) {
        alert('Ce code d\'identification est déjà utilisé par un autre membre');
        return;
    }
    
    // Mettre à jour le personnel
    personnels[index] = {
        ...personnels[index],
        nom,
        code,
        poste,
        telephone: telephone || null,
        statut,
        commentaires: commentaires || null,
        dateModification: new Date().toISOString()
    };
    
    savePersonnels();
    loadPersonnels();
    hideEditPersonnelModal();
    
    alert('Membre du personnel mis à jour avec succès !');
}
    
    // Vérifier si le code existe déjà pour un autre personnel
    const autrePersonnel = personnels.find(p => p.code === code && p.id !== id);
    if (autrePersonnel) {
        alert('Ce code d\'identification est déjà utilisé par un autre membre');
        return;
    }
    
    personnels[index] = {
        ...personnels[index],
        nom,
        code,
        poste,
        telephone: telephone || null,
        statut,
        commentaires: commentaires || null
    };
    
    savePersonnels();
    loadPersonnels();
    hideEditPersonnelModal();
    alert('Membre du personnel mis à jour avec succès !');
}

// Charger les personnels
function loadPersonnels() {
    // Mettre à jour la liste dans le formulaire d'inscription
    const inscripteurList = document.getElementById('inscripteurList');
    const filterInscripteur = document.getElementById('filterInscripteur');
    
    inscripteurList.innerHTML = '';
    filterInscripteur.innerHTML = '<option value="">Tous les inscripteurs</option>';
    
    const personnelsActifs = personnels.filter(p => p.statut === 'actif');
    
    if (personnelsActifs.length === 0) {
        inscripteurList.innerHTML = '<p class="no-personnel">Aucun membre du personnel disponible</p>';
    } else {
        personnelsActifs.forEach(personnel => {
            // Pour la liste de sélection
            const item = document.createElement('div');
            item.className = 'inscripteur-item';
            item.innerHTML = `
                <h4>${personnel.nom}</h4>
                <p>${personnel.poste} - ${personnel.code}</p>
            `;
            item.addEventListener('click', function() {
                document.querySelectorAll('.inscripteur-item').forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                document.getElementById('inscripteurId').value = `${personnel.code} - ${personnel.nom}`;
                document.getElementById('inscripteurPoste').value = personnel.poste;
            });
            inscripteurList.appendChild(item);
            
            // Pour le filtre
            const option = document.createElement('option');
            option.value = personnel.code;
            option.textContent = `${personnel.code} - ${personnel.nom}`;
            filterInscripteur.appendChild(option);
        });
    }
    
    // Mettre à jour la liste du personnel
    const personnelListBody = document.getElementById('personnelListBody');
    personnelListBody.innerHTML = '';
    
    personnels.forEach(personnel => {
        const inscriptionsCount = inscriptions.filter(i => 
            i.inscripteur && i.inscripteur.code === personnel.code
        ).length;
        
        const totalMontant = inscriptions.filter(i => 
            i.inscripteur && i.inscripteur.code === personnel.code
        ).reduce((sum, ins) => sum + ins.montant, 0);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${personnel.code}</strong></td>
            <td>${personnel.nom}</td>
            <td>${personnel.poste}</td>
            <td>${personnel.telephone || '-'}</td>
            <td><span class="status-${personnel.statut}">${personnel.statut === 'actif' ? 'Actif' : 'Inactif'}</span></td>
            <td>${inscriptionsCount} (${totalMontant.toLocaleString()} F)</td>
            <td>
                <div class="actions-buttons">
                    <button class="action-btn edit" title="Modifier" onclick="editPersonnel(${personnel.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" title="Supprimer" onclick="confirmDeletePersonnel(${personnel.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        personnelListBody.appendChild(row);
    });
    
    // Mettre à jour les statistiques du personnel
    updatePersonnelStats();
}

// Recherche de personnel
function searchPersonnel() {
    const searchTerm = document.getElementById('searchInscripteur').value.toLowerCase();
    const items = document.querySelectorAll('.inscripteur-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Filtrer le personnel
function filterPersonnel() {
    const searchTerm = document.getElementById('searchPersonnel').value.toLowerCase();
    const rows = document.querySelectorAll('#personnelListBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Ajouter un personnel
function addPersonnel() {
    const nom = document.getElementById('personnelNom').value.trim();
    const code = document.getElementById('personnelCode').value.trim();
    const poste = document.getElementById('personnelPoste').value.trim();
    const telephone = document.getElementById('personnelTelephone').value.trim();
    const statut = document.getElementById('personnelStatut').value;
    const commentaires = document.getElementById('personnelCommentaires').value.trim();
    
    if (!nom || !code || !poste) {
        alert('Veuillez remplir tous les champs obligatoires (*)');
        return;
    }
    
    // Vérifier si le code existe déjà
    if (personnels.some(p => p.code === code)) {
        alert('Ce code d\'identification existe déjà');
        return;
    }
    
    const nouveauPersonnel = {
        id: Date.now(),
        nom,
        code,
        poste,
        telephone: telephone || null,
        statut,
        commentaires: commentaires || null,
        dateCreation: new Date().toISOString()
    };
    
    personnels.push(nouveauPersonnel);
    savePersonnels();
    loadPersonnels();
    
    // Réinitialiser le formulaire
    document.getElementById('formPersonnel').reset();
    alert('Membre du personnel ajouté avec succès !');
}

// ==================== GESTION DES INSCRIPTIONS ====================

// Mettre à jour la catégorie d'âge
function updateAgeCategory() {
    const age = parseInt(document.getElementById('age').value) || 0;
    let categorie = 'Enfant';
    
    if (age >= 3 && age <= 4) categorie = '3-4 ans';
    else if (age >= 5 && age <= 6) categorie = '5-6 ans';
    else if (age >= 7 && age <= 8) categorie = '7-8 ans';
    else if (age >= 9 && age <= 10) categorie = '9-10 ans';
    else if (age >= 11 && age <= 12) categorie = '11-12 ans';
    else if (age >= 13 && age <= 14) categorie = '13-14 ans';
    
    document.getElementById('categorieAge').textContent = categorie;
}

// Soumettre une inscription
function submitInscription() {
    const age = parseInt(document.getElementById('age').value);
    
    // Validation de l'âge
    if (age < 3 || age > 14) {
        alert('L\'âge doit être compris entre 3 et 14 ans');
        return;
    }
    
    // Récupérer l'inscripteur
    let inscripteur = null;
    const inscripteurType = document.querySelector('input[name="inscripteurType"]:checked').value;
    
    if (inscripteurType === 'personnel') {
        const inscripteurText = document.getElementById('inscripteurId').value;
        const inscripteurPoste = document.getElementById('inscripteurPoste').value;
        
        if (!inscripteurText || !inscripteurPoste) {
            alert('Veuillez sélectionner un membre du personnel');
            return;
        }
        
        // Extraire le code du personnel
        const match = inscripteurText.match(/^([A-Z]{3}\d+) -/);
        if (match) {
            const personnel = personnels.find(p => p.code === match[1]);
            if (personnel) {
                inscripteur = {
                    code: personnel.code,
                    nom: personnel.nom,
                    poste: personnel.poste
                };
            }
        }
    } else {
        const externalName = document.getElementById('externalName').value.trim();
        const externalPoste = "Personne extérieure";
        
        if (!externalName) {
            alert('Veuillez saisir le nom de la personne extérieure');
            return;
        }
        
        inscripteur = {
            code: "EXT-" + Date.now().toString().slice(-4),
            nom: externalName,
            poste: externalPoste
        };
    }
    
    if (!inscripteur) {
        alert('Veuillez identifier la personne qui inscrit l\'enfant');
        return;
    }
    
    const formData = {
        id: Date.now(),
        nom: document.getElementById('nom').value.trim(),
        sexe: document.querySelector('input[name="sexe"]:checked').value,
        age: age,
        telephone: document.getElementById('telephone').value.trim(),
        parent: document.getElementById('parent').value.trim(),
        taille: document.getElementById('taille').value,
        montant: getSelectedMontant(),
        commentaires: document.getElementById('commentaires').value.trim() || null,
        inscripteur: inscripteur,
        dateInscription: new Date().toISOString(),
        tshirt: {
            recu: false,
            dateDistribution: null,
            distribuePar: null
        }
    };
    
    // Validation
    if (!formData.nom || !formData.sexe || !formData.age || !formData.telephone || 
        !formData.montant || !formData.taille || !formData.parent) {
        alert('Veuillez remplir tous les champs obligatoires (*)');
        return;
    }
    
    if (formData.montant < 500) {
        alert('Le montant minimum est de 500 F CFA');
        return;
    }
    
    // Ajouter à la liste
    inscriptions.push(formData);
    saveInscriptions();
    
    // Afficher confirmation
    showConfirmation(formData);
    
    // Réinitialiser le formulaire
    document.getElementById('formInscription').reset();
    updateAgeCategory();
    document.getElementById('montantLibre').style.display = 'none';
    document.getElementById('externalInscripteur').style.display = 'none';
    
    // Mettre à jour les statistiques
    updateStatistics();
    updateCharts();
}

// Obtenir le montant sélectionné
function getSelectedMontant() {
    const selected = document.querySelector('input[name="montant"]:checked');
    if (selected.value === 'autre') {
        return parseFloat(document.getElementById('montantAutre').value) || 0;
    }
    return parseFloat(selected.value);
}

// Afficher la confirmation
function showConfirmation(data) {
    const modal = document.getElementById('confirmationModal');
    const message = document.getElementById('confirmationMessage');
    const recap = document.getElementById('recapDetails');
    
    message.textContent = `Enfant inscrit avec succès ! Merci pour votre participation.`;
    
    recap.innerHTML = `
        <p><strong>ID d'inscription:</strong> OPPE-${data.id}</p>
        <p><strong>Nom enfant:</strong> ${data.nom}</p>
        <p><strong>Sexe:</strong> ${data.sexe}</p>
        <p><strong>Âge:</strong> ${data.age} ans</p>
        <p><strong>Taille T-shirt:</strong> ${data.taille}</p>
        <p><strong>Parent:</strong> ${data.parent}</p>
        <p><strong>Téléphone:</strong> ${data.telephone}</p>
        <p><strong>Inscrit par:</strong> ${data.inscripteur.nom} (${data.inscripteur.poste})</p>
        <p><strong>Contribution:</strong> ${data.montant.toLocaleString()} F CFA</p>
        <p><strong>Date:</strong> ${new Date(data.dateInscription).toLocaleDateString('fr-FR')}</p>
    `;
    
    modal.style.display = 'block';
}

// Fermer le modal
function closeModal() {
    document.getElementById('confirmationModal').style.display = 'none';
}

// Imprimer le récapitulatif
function printRecap() {
    const printContent = document.querySelector('.modal-body').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
        <html>
            <head>
                <title>Récapitulatif Inscription OPPE 2026</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1e3c72; border-bottom: 2px solid #1e3c72; padding-bottom: 10px; }
                    .recap { background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #1e3c72; }
                    p { margin: 8px 0; }
                    strong { color: #1e3c72; }
                    @media print {
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1><i class="fas fa-child"></i> Confirmation d'Inscription OPPE 2026</h1>
                ${printContent}
            </body>
        </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    location.reload();
}

// Charger la liste des inscrits
function loadInscriptionsList() {
    const tbody = document.getElementById('listeBody');
    tbody.innerHTML = '';
    
    if (inscriptions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px;">
                    <i class="fas fa-child" style="font-size: 3em; color: #ddd; margin-bottom: 20px; display: block;"></i>
                    <p>Aucun enfant inscrit pour le moment</p>
                </td>
            </tr>
        `;
        updateSummary();
        return;
    }
    
    inscriptions.sort((a, b) => new Date(b.dateInscription) - new Date(a.dateInscription));
    
    inscriptions.forEach(inscription => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>OPPE-${inscription.id}</td>
            <td><strong>${inscription.nom}</strong></td>
            <td>${inscription.sexe === 'Garçon' ? '<i class="fas fa-male"></i>' : '<i class="fas fa-female"></i>'} ${inscription.sexe}</td>
            <td>${inscription.age} ans</td>
            <td>${inscription.parent}</td>
            <td>${inscription.telephone}</td>
            <td><span class="montant-badge">${inscription.taille}</span></td>
            <td><span class="montant-badge">${inscription.montant.toLocaleString()} F</span></td>
            <td><span class="inscripteur-badge">${inscription.inscripteur.nom}</span></td>
            <td>${new Date(inscription.dateInscription).toLocaleDateString('fr-FR')}</td>
            <td>${inscription.tshirt.recu ? 
                '<span class="status-success"><i class="fas fa-check"></i> Oui</span>' : 
                '<span class="status-pending"><i class="fas fa-clock"></i> Non</span>'}</td>
        `;
        tbody.appendChild(row);
    });
    
    updateSummary();
}

// Mettre à jour le résumé
function updateSummary() {
    const totalInscrits = inscriptions.length;
    const totalMontant = inscriptions.reduce((sum, ins) => sum + ins.montant, 0);
    const totalTshirts = inscriptions.filter(ins => ins.tshirt.recu).length;
    
    // Compter les inscripteurs uniques
    const inscripteurs = new Set();
    inscriptions.forEach(ins => {
        if (ins.inscripteur) {
            inscripteurs.add(ins.inscripteur.code);
        }
    });
    
    document.getElementById('totalInscrits').textContent = totalInscrits;
    document.getElementById('totalMontant').textContent = `${totalMontant.toLocaleString()} F`;
    document.getElementById('totalTshirts').textContent = totalTshirts;
    document.getElementById('totalInscripteurs').textContent = inscripteurs.size;
}

// Filtrer les inscriptions
function filterInscriptions() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#listeBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Filtrer par inscripteur
function filterInscriptionsByPersonnel() {
    const selectedCode = document.getElementById('filterInscripteur').value;
    const rows = document.querySelectorAll('#listeBody tr');
    
    rows.forEach(row => {
        if (!selectedCode) {
            row.style.display = '';
            return;
        }
        
        const inscripteurCell = row.cells[8];
        const inscripteurText = inscripteurCell.textContent;
        
        // Vérifier si l'inscripteur correspond
        row.style.display = inscripteurText.includes(selectedCode) ? '' : 'none';
    });
}

// Charger une inscription dans le formulaire de modification
function loadInscriptionToForm(inscription) {
    document.getElementById('editId').value = inscription.id;
    document.getElementById('editNom').value = inscription.nom;
    document.getElementById('editSexe').value = inscription.sexe;
    document.getElementById('editAge').value = inscription.age;
    document.getElementById('editTelephone').value = inscription.telephone;
    document.getElementById('editParent').value = inscription.parent;
    document.getElementById('editTaille').value = inscription.taille;
    document.getElementById('editMontant').value = inscription.montant;
    document.getElementById('editInscripteur').value = inscription.inscripteur.nom;
    document.getElementById('editInscripteurPoste').value = inscription.inscripteur.poste;
    document.getElementById('editCommentaires').value = inscription.commentaires || '';
    
    // T-shirt
    document.getElementById('editTshirt').checked = inscription.tshirt.recu;
    document.getElementById('editDateTshirt').value = inscription.tshirt.dateDistribution || 
        new Date().toISOString().split('T')[0];
    document.getElementById('editDistribuePar').value = inscription.tshirt.distribuePar || '';
    
    // Afficher/masquer les détails t-shirt
    document.querySelector('.tshirt-details').style.display = 
        inscription.tshirt.recu ? 'block' : 'none';
}

// Mettre à jour une inscription
function updateInscription() {
    const index = inscriptions.findIndex(ins => ins.id === currentEditId);
    
    if (index === -1) {
        alert('Inscription non trouvée');
        return;
    }
    
    inscriptions[index] = {
        ...inscriptions[index],
        nom: document.getElementById('editNom').value.trim(),
        sexe: document.getElementById('editSexe').value,
        age: parseInt(document.getElementById('editAge').value),
        telephone: document.getElementById('editTelephone').value.trim(),
        parent: document.getElementById('editParent').value.trim(),
        taille: document.getElementById('editTaille').value,
        montant: parseFloat(document.getElementById('editMontant').value) || 0,
        commentaires: document.getElementById('editCommentaires').value.trim() || null,
        tshirt: {
            recu: document.getElementById('editTshirt').checked,
            dateDistribution: document.getElementById('editDateTshirt').value || null,
            distribuePar: document.getElementById('editDistribuePar').value.trim() || null
        }
    };
    
    saveInscriptions();
    alert('Inscription mise à jour avec succès !');
    
    // Recharger les listes et statistiques
    loadInscriptionsList();
    updateStatistics();
    updateCharts();
    
    // Réinitialiser le formulaire
    document.getElementById('editFormContainer').style.display = 'none';
    document.getElementById('searchModify').value = '';
}

// Supprimer une inscription
function deleteInscription() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette inscription ?')) {
        return;
    }
    
    const index = inscriptions.findIndex(ins => ins.id === currentEditId);
    
    if (index !== -1) {
        inscriptions.splice(index, 1);
        saveInscriptions();
        alert('Inscription supprimée avec succès');
        
        // Recharger les listes et statistiques
        loadInscriptionsList();
        updateStatistics();
        updateCharts();
        
        // Réinitialiser le formulaire
        document.getElementById('editFormContainer').style.display = 'none';
        document.getElementById('searchModify').value = '';
    }
}

// ==================== STATISTIQUES ====================

// Mettre à jour les statistiques
function updateStatistics() {
    const stats = {
        total: inscriptions.length,
        garcons: inscriptions.filter(ins => ins.sexe === 'Garçon').length,
        filles: inscriptions.filter(ins => ins.sexe === 'Fille').length,
        totalMontant: inscriptions.reduce((sum, ins) => sum + ins.montant, 0),
        tshirtsRecus: inscriptions.filter(ins => ins.tshirt.recu).length,
        categoriesAge: {
            '3-4': inscriptions.filter(ins => ins.age >= 3 && ins.age <= 4).length,
            '5-6': inscriptions.filter(ins => ins.age >= 5 && ins.age <= 6).length,
            '7-8': inscriptions.filter(ins => ins.age >= 7 && ins.age <= 8).length,
            '9-10': inscriptions.filter(ins => ins.age >= 9 && ins.age <= 10).length,
            '11-12': inscriptions.filter(ins => ins.age >= 11 && ins.age <= 12).length,
            '13-14': inscriptions.filter(ins => ins.age >= 13 && ins.age <= 14).length
        },
        montants: {
            '1 000 F': inscriptions.filter(ins => ins.montant === 1000).length,
            '1 500 F': inscriptions.filter(ins => ins.montant === 1500).length,
            '2 000 F': inscriptions.filter(ins => ins.montant === 2000).length,
            '2 500 F': inscriptions.filter(ins => ins.montant === 2500).length,
            'Autre': inscriptions.filter(ins => ![1000,1500,2000,2500].includes(ins.montant)).length
        },
        inscripteurs: {}
    };
    
    // Compter par inscripteur
    inscriptions.forEach(ins => {
        if (ins.inscripteur) {
            const key = ins.inscripteur.code;
            stats.inscripteurs[key] = stats.inscripteurs[key] || {
                nom: ins.inscripteur.nom,
                poste: ins.inscripteur.poste,
                count: 0,
                montant: 0
            };
            stats.inscripteurs[key].count++;
            stats.inscripteurs[key].montant += ins.montant;
        }
    });
    
    // Mettre à jour les détails
    const detailsDiv = document.getElementById('statsDetails');
    if (detailsDiv) {
        detailsDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div class="stat-detail">
                    <h4>Par sexe</h4>
                    <p>Garçons: ${stats.garcons} (${(stats.garcons/stats.total*100 || 0).toFixed(1)}%)</p>
                    <p>Filles: ${stats.filles} (${(stats.filles/stats.total*100 || 0).toFixed(1)}%)</p>
                </div>
                <div class="stat-detail">
                    <h4>Par âge</h4>
                    <p>3-4 ans: ${stats.categoriesAge['3-4']}</p>
                    <p>5-6 ans: ${stats.categoriesAge['5-6']}</p>
                    <p>7-8 ans: ${stats.categoriesAge['7-8']}</p>
                    <p>9-10 ans: ${stats.categoriesAge['9-10']}</p>
                    <p>11-12 ans: ${stats.categoriesAge['11-12']}</p>
                    <p>13-14 ans: ${stats.categoriesAge['13-14']}</p>
                </div>
                <div class="stat-detail">
                    <h4>Contribution</h4>
                    <p>1 000 F: ${stats.montants['1 000 F']}</p>
                    <p>1 500 F: ${stats.montants['1 500 F']}</p>
                    <p>2 000 F: ${stats.montants['2 000 F']}</p>
                    <p>2 500 F: ${stats.montants['2 500 F']}</p>
                    <p>Autre: ${stats.montants['Autre']}</p>
                    <p><strong>Total: ${stats.totalMontant.toLocaleString()} F CFA</strong></p>
                </div>
                <div class="stat-detail">
                    <h4>T-shirts</h4>
                    <p>Distribués: ${stats.tshirtsRecus}</p>
                    <p>À distribuer: ${stats.total - stats.tshirtsRecus}</p>
                    <p>Taux: ${(stats.tshirtsRecus/stats.total*100 || 0).toFixed(1)}%</p>
                </div>
            </div>
            
            <div class="stat-detail" style="margin-top: 20px;">
                <h4>Inscriptions par personnel</h4>
                ${Object.values(stats.inscripteurs).map(inscripteur => `
                    <p>${inscripteur.nom}: ${inscripteur.count} inscription(s) - ${inscripteur.montant.toLocaleString()} F</p>
                `).join('')}
            </div>
        `;
    }
}

// ==================== GRAPHIQUES ====================

// Initialiser les graphiques
function initializeCharts() {
    window.charts = {
        sexe: new Chart(document.getElementById('chartSexe'), {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] }
        }),
        age: new Chart(document.getElementById('chartAge'), {
            type: 'bar',
            data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] }
        }),
        montants: new Chart(document.getElementById('chartMontants'), {
            type: 'pie',
            data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] }
        }),
        inscripteurs: new Chart(document.getElementById('chartInscripteurs'), {
            type: 'bar',
            data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] }
        })
    };
    
    updateCharts();
}

// Mettre à jour les graphiques
function updateCharts() {
    if (inscriptions.length === 0) {
        Object.values(window.charts).forEach(chart => {
            chart.data.labels = ['Aucune donnée'];
            chart.data.datasets[0].data = [1];
            chart.data.datasets[0].backgroundColor = ['#ddd'];
            chart.update();
        });
        return;
    }
    
    // Graphique sexe
    const garcons = inscriptions.filter(ins => ins.sexe === 'Garçon').length;
    const filles = inscriptions.filter(ins => ins.sexe === 'Fille').length;
    if (window.charts.sexe) {
        window.charts.sexe.data.labels = ['Garçons', 'Filles'];
        window.charts.sexe.data.datasets[0].data = [garcons, filles];
        window.charts.sexe.data.datasets[0].backgroundColor = ['#3498db', '#e84393'];
        window.charts.sexe.update();
    }
    
    // Graphique âge
    const categoriesAge = ['3-4', '5-6', '7-8', '9-10', '11-12', '13-14'];
    const agesData = categoriesAge.map(cat => 
        inscriptions.filter(ins => {
            const age = ins.age;
            if (cat === '3-4') return age >= 3 && age <= 4;
            if (cat === '5-6') return age >= 5 && age <= 6;
            if (cat === '7-8') return age >= 7 && age <= 8;
            if (cat === '9-10') return age >= 9 && age <= 10;
            if (cat === '11-12') return age >= 11 && age <= 12;
            if (cat === '13-14') return age >= 13 && age <= 14;
            return false;
        }).length
    );
    if (window.charts.age) {
        window.charts.age.data.labels = categoriesAge.map(cat => `${cat} ans`);
        window.charts.age.data.datasets[0].data = agesData;
        window.charts.age.data.datasets[0].backgroundColor = ['#74b9ff', '#55efc4', '#ffeaa7', '#fab1a0', '#a29bfe', '#fd79a8'];
        window.charts.age.update();
    }
    
    // Graphique montants
    const montantsData = [
        inscriptions.filter(ins => ins.montant === 1000).length,
        inscriptions.filter(ins => ins.montant === 1500).length,
        inscriptions.filter(ins => ins.montant === 2000).length,
        inscriptions.filter(ins => ins.montant === 2500).length,
        inscriptions.filter(ins => ![1000,1500,2000,2500].includes(ins.montant)).length
    ];
    if (window.charts.montants) {
        window.charts.montants.data.labels = ['1 000 F', '1 500 F', '2 000 F', '2 500 F', 'Autre'];
        window.charts.montants.data.datasets[0].data = montantsData;
        window.charts.montants.data.datasets[0].backgroundColor = ['#00b894', '#00cec9', '#0984e3', '#6c5ce7', '#fdcb6e'];
        window.charts.montants.update();
    }
    
    // Graphique inscripteurs
    const inscripteursStats = {};
    inscriptions.forEach(ins => {
        if (ins.inscripteur) {
            const key = ins.inscripteur.code;
            inscripteursStats[key] = inscripteursStats[key] || {
                nom: ins.inscripteur.nom,
                count: 0
            };
            inscripteursStats[key].count++;
        }
    });
    
    const inscripteursLabels = Object.values(inscripteursStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(ins => ins.nom);
    
    const inscripteursData = Object.values(inscripteursStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(ins => ins.count);
    
    if (window.charts.inscripteurs) {
        window.charts.inscripteurs.data.labels = inscripteursLabels;
        window.charts.inscripteurs.data.datasets[0].data = inscripteursData;
        window.charts.inscripteurs.data.datasets[0].backgroundColor = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
            '#98D8C8', '#F7B7A3', '#C9B1BD', '#B5EAD7'
        ];
        window.charts.inscripteurs.update();
    }
}

// ==================== BASE DE DONNÉES ====================

// Export vers Excel
function exportToExcel() {
    if (inscriptions.length === 0) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    const data = inscriptions.map(ins => ({
        'ID': `OPPE-${ins.id}`,
        'Nom enfant': ins.nom,
        'Sexe': ins.sexe,
        'Âge': ins.age,
        'Nom parent': ins.parent,
        'Téléphone': ins.telephone,
        'Taille T-shirt': ins.taille,
        'Contribution (F CFA)': ins.montant,
        'Inscrit par (nom)': ins.inscripteur.nom,
        'Inscrit par (poste)': ins.inscripteur.poste,
        'Inscrit par (code)': ins.inscripteur.code,
        'Date inscription': new Date(ins.dateInscription).toLocaleDateString('fr-FR'),
        'T-shirt donné': ins.tshirt.recu ? 'Oui' : 'Non',
        'Date distribution': ins.tshirt.dateDistribution || '',
        'Distribué par': ins.tshirt.distribuePar || '',
        'Informations médicales': ins.commentaires || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions OPPE 2026');
    XLSX.writeFile(wb, `oppe_inscriptions_2026_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    alert('Export Excel terminé avec succès !');
}

// Export vers CSV
function exportToCSV() {
    if (inscriptions.length === 0) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    const csvContent = [
        ['ID', 'Nom enfant', 'Sexe', 'Âge', 'Nom parent', 'Téléphone', 'Taille T-shirt', 'Contribution (F CFA)', 'Inscrit par (nom)', 'Inscrit par (poste)', 'Inscrit par (code)', 'Date inscription', 'T-shirt donné', 'Date distribution', 'Distribué par', 'Informations médicales'],
        ...inscriptions.map(ins => [
            `OPPE-${ins.id}`,
            ins.nom,
            ins.sexe,
            ins.age,
            ins.parent,
            ins.telephone,
            ins.taille,
            ins.montant,
            ins.inscripteur.nom,
            ins.inscripteur.poste,
            ins.inscripteur.code,
            new Date(ins.dateInscription).toLocaleDateString('fr-FR'),
            ins.tshirt.recu ? 'Oui' : 'Non',
            ins.tshirt.dateDistribution || '',
            ins.tshirt.distribuePar || '',
            ins.commentaires || ''
        ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `oppe_inscriptions_2026_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Export CSV terminé avec succès !');
}

// Sauvegarder les données
function backupData() {
    const backup = {
        inscriptions: inscriptions,
        personnels: personnels,
        timestamp: new Date().toISOString(),
        total: inscriptions.length,
        version: '3.0'
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `oppe_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    localStorage.setItem('lastBackup', new Date().toISOString());
    updateDatabaseInfo();
    
    alert('Sauvegarde terminée avec succès !');
}

// Restaurer les données
function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('Attention ! Cela écrasera toutes les données actuelles. Continuer ?')) {
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            
            if (!backup.inscriptions || !Array.isArray(backup.inscriptions)) {
                throw new Error('Format de fichier invalide');
            }
            
            inscriptions = backup.inscriptions;
            personnels = backup.personnels || [];
            saveInscriptions();
            savePersonnels();
            
            loadInscriptionsList();
            loadPersonnels();
            updateStatistics();
            updateCharts();
            updateDatabaseInfo();
            
            alert(`Données restaurées avec succès ! ${inscriptions.length} inscriptions et ${personnels.length} personnels chargés.`);
        } catch (error) {
            alert('Erreur lors de la restauration : ' + error.message);
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

// Générer un rapport complet
function generateReport() {
    if (inscriptions.length === 0) {
        alert('Aucune donnée pour générer un rapport');
        return;
    }
    
    const reportWindow = window.open('', '_blank');
    const stats = {
        total: inscriptions.length,
        garcons: inscriptions.filter(ins => ins.sexe === 'Garçon').length,
        filles: inscriptions.filter(ins => ins.sexe === 'Fille').length,
        totalMontant: inscriptions.reduce((sum, ins) => sum + ins.montant, 0),
        tshirtsRecus: inscriptions.filter(ins => ins.tshirt.recu).length,
        montantMoyen: (inscriptions.reduce((sum, ins) => sum + ins.montant, 0) / inscriptions.length).toFixed(2)
    };
    
    // Statistiques par personnel
    const personnelStats = {};
    inscriptions.forEach(ins => {
        if (ins.inscripteur) {
            const key = ins.inscripteur.code;
            personnelStats[key] = personnelStats[key] || {
                nom: ins.inscripteur.nom,
                count: 0,
                montant: 0
            };
            personnelStats[key].count++;
            personnelStats[key].montant += ins.montant;
        }
    });
    
    const personnelRows = Object.values(personnelStats)
        .sort((a, b) => b.count - a.count)
        .map(p => `
            <tr>
                <td>${p.nom}</td>
                <td>${p.count}</td>
                <td>${p.montant.toLocaleString()} F</td>
                <td>${((p.count / stats.total) * 100).toFixed(1)}%</td>
            </tr>
        `).join('');
    
    reportWindow.document.write(`
        <html>
            <head>
                <title>Rapport OPPE 2026</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1e3c72; border-bottom: 2px solid #1e3c72; }
                    h2 { color: #1e3c72; margin-top: 30px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
                    .stat-card { background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; }
                    .stat-card h3 { color: #1e3c72; margin: 0 0 10px 0; }
                    .stat-number { font-size: 2.5em; font-weight: bold; color: #1e3c72; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th { background: #1e3c72; color: white; padding: 10px; }
                    td { border: 1px solid #ddd; padding: 10px; }
                    .total-row { font-weight: bold; background: #f0f0f0; }
                    .personnel-table { margin-top: 30px; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Rapport Complet - OPPE 2026</h1>
                <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Total Inscriptions</h3>
                        <div class="stat-number">${stats.total}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Total Collecté</h3>
                        <div class="stat-number">${stats.totalMontant.toLocaleString()} F</div>
                    </div>
                    <div class="stat-card">
                        <h3>Garçons/Filles</h3>
                        <div class="stat-number">${stats.garcons}/${stats.filles}</div>
                    </div>
                </div>
                
                <h2>Performance par Personnel</h2>
                <table class="personnel-table">
                    <tr>
                        <th>Personnel</th>
                        <th>Nombre d'inscriptions</th>
                        <th>Total collecté</th>
                        <th>% du total</th>
                    </tr>
                    ${personnelRows}
                </table>
                
                <h2>Détail des Contributions</h2>
                <table>
                    <tr>
                        <th>Montant</th>
                        <th>Nombre</th>
                        <th>Total</th>
                        <th>%</th>
                    </tr>
                    ${[1000, 1500, 2000, 2500].map(montant => {
                        const count = inscriptions.filter(ins => ins.montant === montant).length;
                        const total = count * montant;
                        const percentage = ((count / stats.total) * 100).toFixed(1);
                        return `
                            <tr>
                                <td>${montant} F</td>
                                <td>${count}</td>
                                <td>${total.toLocaleString()} F</td>
                                <td>${percentage}%</td>
                            </tr>
                        `;
                    }).join('')}
                    <tr class="total-row">
                        <td><strong>TOTAL</strong></td>
                        <td><strong>${stats.total}</strong></td>
                        <td><strong>${stats.totalMontant.toLocaleString()} F</strong></td>
                        <td><strong>100%</strong></td>
                    </tr>
                </table>
                
                <button class="no-print" onclick="window.print()">Imprimer le rapport</button>
                <button class="no-print" onclick="window.close()">Fermer</button>
            </body>
        </html>
    `);
}

// Imprimer la synthèse
function printSummary() {
    const printWindow = window.open('', '_blank');
    const stats = {
        total: inscriptions.length,
        totalMontant: inscriptions.reduce((sum, ins) => sum + ins.montant, 0),
        tshirtsRecus: inscriptions.filter(ins => ins.tshirt.recu).length
    };
    
    printWindow.document.write(`
        <html>
            <head>
                <title>Synthèse OPPE 2026</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1e3c72; text-align: center; }
                    .summary { margin: 30px auto; max-width: 600px; }
                    .summary-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
                    .total { font-weight: bold; font-size: 1.2em; color: #1e3c72; }
                    @media print {
                        @page { size: portrait; margin: 20mm; }
                    }
                </style>
            </head>
            <body>
                <h1>Synthèse des Inscriptions OPPE 2026</h1>
                <p style="text-align: center;">Date: ${new Date().toLocaleDateString('fr-FR')}</p>
                
                <div class="summary">
                    <div class="summary-item">
                        <span>Total enfants inscrits:</span>
                        <span>${stats.total}</span>
                    </div>
                    <div class="summary-item">
                        <span>Total contributions collectées:</span>
                        <span>${stats.totalMontant.toLocaleString()} F CFA</span>
                    </div>
                    <div class="summary-item">
                        <span>T-shirts distribués:</span>
                        <span>${stats.tshirtsRecus}</span>
                    </div>
                    <div class="summary-item total">
                        <span>En attente de t-shirt:</span>
                        <span>${stats.total - stats.tshirtsRecus}</span>
                    </div>
                </div>
                
                <p style="margin-top: 50px; text-align: center;">
                    Signature du responsable:<br><br>
                    ________________________<br>
                    Nom et prénom
                </p>
                
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 1000);
                    }
                </script>
            </body>
        </html>
    `);
}

// Effacer toutes les données
function clearAllData() {
    if (!confirm('ATTENTION ! Cela supprimera TOUTES les inscriptions définitivement. Continuer ?')) {
        return;
    }
    
    if (!confirm('Êtes-vous ABSOLUMENT SÛR ? Cette action est irréversible.')) {
        return;
    }
    
    inscriptions = [];
    personnels = [];
    saveInscriptions();
    savePersonnels();
    
    loadInscriptionsList();
    loadPersonnels();
    updateStatistics();
    updateCharts();
    updateDatabaseInfo();
    
    alert('Toutes les données ont été supprimées.');
}

// Réinitialiser l'application
function resetApplication() {
    if (!confirm('Cette action réinitialisera toutes les données et paramètres. Continuer ?')) {
        return;
    }
    
    localStorage.clear();
    alert('Application réinitialisée. La page va se recharger.');
    window.location.reload();
}

// Mettre à jour les informations de la base de données
function updateDatabaseInfo() {
    const total = inscriptions.length;
    const totalPersonnel = personnels.length;
    const lastBackup = localStorage.getItem('lastBackup');
    const storageSize = JSON.stringify(inscriptions).length + JSON.stringify(personnels).length;
    
    const dbTotal = document.getElementById('dbTotal');
    const dbPersonnel = document.getElementById('dbPersonnel');
    const lastBackupEl = document.getElementById('lastBackup');
    const storageUsed = document.getElementById('storageUsed');
    
    if (dbTotal) dbTotal.textContent = total;
    if (dbPersonnel) dbPersonnel.textContent = totalPersonnel;
    if (lastBackupEl) lastBackupEl.textContent = lastBackup ? 
        new Date(lastBackup).toLocaleDateString('fr-FR') : 'Jamais';
    if (storageUsed) storageUsed.textContent = `${Math.round(storageSize / 1024)} Ko`;
}

// ==================== GESTION DES MOTS DE PASSE ====================

function showPasswordModal() {
    document.getElementById('passwordModal').style.display = 'block';
}

function hidePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (currentPassword !== "OPPE2026") {
        alert('Mot de passe actuel incorrect');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('Le nouveau mot de passe doit contenir au moins 6 caractères');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('Les nouveaux mots de passe ne correspondent pas');
        return;
    }
    
    alert('Mot de passe changé avec succès !\n\nNote: En production, vous devez implémenter un stockage sécurisé des mots de passe.');
    hidePasswordModal();
}

// ==================== SAUVEGARDE DES DONNÉES ====================

function saveInscriptions() {
    localStorage.setItem('oppe_inscriptions_2026', JSON.stringify(inscriptions));
}

function savePersonnels() {
    localStorage.setItem('oppe_personnels_2026', JSON.stringify(personnels));
}

