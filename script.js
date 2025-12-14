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

// Initialisation
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

// Timer de session
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

// Déconnexion
function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        localStorage.removeItem('isAuthenticated');
        window.location.href = 'login.html';
    }
}

// Gestion des onglets
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

// Gestion des formulaires
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
    
    // Recherche pour modification
    document.getElementById('searchBtn').addEventListener('click', searchInscription);
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

// Fonction pour éditer un personnel (appelée depuis la liste)
function editPersonnel(id) {
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
    
    // Afficher le modal
    document.getElementById('editPersonnelModal').style.display = 'block';
}

// Fonction pour supprimer un personnel (appelée depuis la liste)
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
    if (document.getElementById('editPersonnelModal').style.display === 'block') {
        hideEditPersonnelModal();
    }
    
    alert('Membre du personnel supprimé avec succès !');
}

// Fermer le modal d'édition
function hideEditPersonnelModal() {
    document.getElementById('editPersonnelModal').style.display = 'none';
    currentEditPersonnelId = null;
    document.getElementById('formEditPersonnel').reset();
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
        alert('Veuillez remplir tous les champs obligatoires');
        return;
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

// Filtrer le personnel
function filterPersonnel() {
    const searchTerm = document.getElementById('searchPersonnel').value.toLowerCase();
    const rows = document.querySelectorAll('#personnelListBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Reste du code inchangé...
// [Toutes les autres fonctions restent identiques]
