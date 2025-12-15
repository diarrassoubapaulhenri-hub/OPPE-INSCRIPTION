// ==================== VARIABLES GLOBALES ====================
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
let sessionTimer = 30 * 60; // 30 minutes en secondes

// ==================== FONCTIONS UTILITAIRES ====================

// Vérifier si un élément existe avant d'ajouter un événement
function safeAddEventListener(id, event, handler) {
    const element = document.getElementById(id);
    if (element && typeof handler === 'function') {
        element.addEventListener(event, handler);
        return true;
    }
    return false;
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier l'authentification
    if (localStorage.getItem('isAuthenticated') !== 'true') {
        window.location.href = 'login.html';
        return;
    }
    
    // Initialiser les composants
    initializeTabs();
    initializeForms();
    loadPersonnels();
    loadInscriptionsList();
    updateStatistics();
    initializeCharts();
    updateDatabaseInfo();
    startSessionTimer();
    
    // Événements pour l'âge
    const ageInput = document.getElementById('age');
    if (ageInput) {
        ageInput.addEventListener('input', updateAgeCategory);
    }
    
    // Événements pour le paiement
    document.querySelectorAll('input[name="montant"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const montantLibre = document.getElementById('montantLibre');
            if (montantLibre) {
                montantLibre.style.display = this.value === 'autre' ? 'block' : 'none';
            }
        });
    });
    
    // Événements pour le type d'inscripteur
    document.querySelectorAll('input[name="inscripteurType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const isExterne = this.value === 'externe';
            const externalInscripteur = document.getElementById('externalInscripteur');
            const inscripteurId = document.getElementById('inscripteurId');
            const inscripteurPoste = document.getElementById('inscripteurPoste');
            
            if (externalInscripteur) {
                externalInscripteur.style.display = isExterne ? 'block' : 'none';
            }
            
            if (inscripteurId) {
                if (isExterne) {
                    inscripteurId.readOnly = false;
                    inscripteurId.placeholder = "Saisissez le nom de la personne extérieure";
                } else {
                    inscripteurId.readOnly = true;
                    inscripteurId.placeholder = "Cliquez sur un membre du personnel";
                    inscripteurId.value = "";
                }
            }
            
            if (inscripteurPoste) {
                inscripteurPoste.readOnly = isExterne;
                if (!isExterne) {
                    inscripteurPoste.value = "";
                }
            }
            
            // Si on passe à externe, désélectionner tout personnel
            if (isExterne) {
                document.querySelectorAll('.inscripteur-item.active').forEach(item => {
                    item.classList.remove('active');
                });
            }
        });
    });
    
    // Recherche d'inscripteur
    const btnSearchInscripteur = document.getElementById('btnSearchInscripteur');
    const searchInscripteur = document.getElementById('searchInscripteur');
    
    if (btnSearchInscripteur) {
        btnSearchInscripteur.addEventListener('click', searchPersonnelInList);
    }
    
    if (searchInscripteur) {
        searchInscripteur.addEventListener('input', searchPersonnelInList);
    }
    
    // Gestion des modals
    const editTshirtCheckbox = document.getElementById('editTshirt');
    if (editTshirtCheckbox) {
        editTshirtCheckbox.addEventListener('change', function() {
            const details = document.querySelector('.tshirt-details');
            if (details) {
                details.style.display = this.checked ? 'block' : 'none';
            }
        });
    }
    
    // Date du T-shirt
    const editDateTshirt = document.getElementById('editDateTshirt');
    if (editDateTshirt) {
        editDateTshirt.value = new Date().toISOString().split('T')[0];
    }
    
    // Déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Modal personnel - événements
    const closeModalBtn = document.querySelector('.close-modal-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideEditPersonnelModal);
    }
    
    const cancelEditPersonnelBtn = document.getElementById('cancelEditPersonnelBtn');
    if (cancelEditPersonnelBtn) {
        cancelEditPersonnelBtn.addEventListener('click', hideEditPersonnelModal);
    }
    
    // Réinitialiser le timer sur les interactions
    ['click', 'keypress', 'submit', 'mousemove'].forEach(event => {
        document.addEventListener(event, resetSessionTimer);
    });
    
    console.log('Application OPPE initialisée avec succès');
});

// ==================== GESTION DE SESSION ====================
function startSessionTimer() {
    const timerElement = document.getElementById('sessionTimer');
    if (!timerElement) return;
    
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
    sessionTimer = 30 * 60; // Réinitialiser à 30 minutes
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
            // Retirer la classe active de tous les boutons et contenus
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Activer l'onglet cliqué
            this.classList.add('active');
            const tabId = this.dataset.tab;
            const tabContent = document.getElementById(tabId);
            
            if (tabContent) {
                tabContent.classList.add('active');
                
                // Charger les données spécifiques à l'onglet
                switch(tabId) {
                    case 'liste':
                        loadInscriptionsList();
                        break;
                    case 'statistiques':
                        updateStatistics();
                        updateCharts();
                        break;
                    case 'inscripteurs':
                        loadPersonnels();
                        break;
                    case 'export':
                        updateDatabaseInfo();
                        break;
                }
            }
            
            resetSessionTimer();
        });
    });
}

// ==================== GESTION DES FORMULAIRES ====================
function initializeForms() {
    // Formulaire d'inscription
    safeAddEventListener('formInscription', 'submit', function(e) {
        e.preventDefault();
        submitInscription();
    });
    
    // Formulaire de modification d'inscription
    safeAddEventListener('formModification', 'submit', function(e) {
        e.preventDefault();
        updateInscription();
    });
    
    // Formulaire d'ajout de personnel
    safeAddEventListener('formPersonnel', 'submit', function(e) {
        e.preventDefault();
        addPersonnel();
    });
    
    // Formulaire de modification de personnel
    safeAddEventListener('formEditPersonnel', 'submit', function(e) {
        e.preventDefault();
        updatePersonnel();
    });
    
    // Recherche d'inscription
    safeAddEventListener('searchBtn', 'click', searchInscription);
    
    const searchModify = document.getElementById('searchModify');
    if (searchModify) {
        searchModify.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchInscription();
        });
    }
    
    // Annuler la modification d'inscription
    safeAddEventListener('cancelEdit', 'click', function() {
        const editFormContainer = document.getElementById('editFormContainer');
        if (editFormContainer) editFormContainer.style.display = 'none';
        
        const searchModify = document.getElementById('searchModify');
        if (searchModify) searchModify.value = '';
    });
    
    // Supprimer une inscription
    safeAddEventListener('deleteBtn', 'click', deleteInscription);
    
    // Recherche dans la liste
    safeAddEventListener('searchInput', 'input', filterInscriptions);
    
    // Filtre par inscripteur
    safeAddEventListener('filterInscripteur', 'change', filterInscriptionsByPersonnel);
    
    // Exports
    safeAddEventListener('exportListBtn', 'click', exportToExcel);
    safeAddEventListener('exportExcelBtn', 'click', exportToExcel);
    safeAddEventListener('exportCSVBtn', 'click', exportToCSV);
    
    // Sauvegarde/Restauration
    safeAddEventListener('backupBtn', 'click', backupData);
    safeAddEventListener('restoreBtn', 'click', () => {
        const restoreFile = document.getElementById('restoreFile');
        if (restoreFile) restoreFile.click();
    });
    
    const restoreFile = document.getElementById('restoreFile');
    if (restoreFile) {
        restoreFile.addEventListener('change', restoreData);
    }
    
    // Rapports
    safeAddEventListener('reportBtn', 'click', generateReport);
    safeAddEventListener('printSummaryBtn', 'click', printSummary);
    
    // Maintenance
    safeAddEventListener('clearDataBtn', 'click', clearAllData);
    safeAddEventListener('resetAppBtn', 'click', resetApplication);
    
    // Modal confirmation
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    safeAddEventListener('nouvelleInscriptionBtn', 'click', function() {
        closeModal();
        const inscriptionTab = document.querySelector('[data-tab="inscription"]');
        if (inscriptionTab) inscriptionTab.click();
    });
    
    safeAddEventListener('imprimerBtn', 'click', printRecap);
    
    // Recherche personnel dans la table
    safeAddEventListener('searchPersonnel', 'input', filterPersonnel);
    
    // Modal mot de passe
    const closePassword = document.querySelector('.close-password');
    if (closePassword) {
        closePassword.addEventListener('click', hidePasswordModal);
    }
    
    safeAddEventListener('cancelPasswordBtn', 'click', hidePasswordModal);
    safeAddEventListener('savePasswordBtn', 'click', changePassword);
    
    // Modal personnel - suppression
    safeAddEventListener('deletePersonnelModalBtn', 'click', deletePersonnelModal);
}

// ==================== GESTION DES INSCRIPTIONS ====================

// Mettre à jour la catégorie d'âge
function updateAgeCategory() {
    const ageInput = document.getElementById('age');
    const categorieSpan = document.getElementById('categorieAge');
    
    if (!ageInput || !categorieSpan) return;
    
    const age = parseInt(ageInput.value) || 0;
    let categorie = 'Enfant';
    
    if (age >= 3 && age <= 4) categorie = '3-4 ans';
    else if (age >= 5 && age <= 6) categorie = '5-6 ans';
    else if (age >= 7 && age <= 8) categorie = '7-8 ans';
    else if (age >= 9 && age <= 10) categorie = '9-10 ans';
    else if (age >= 11 && age <= 12) categorie = '11-12 ans';
    else if (age >= 13 && age <= 14) categorie = '13-14 ans';
    
    categorieSpan.textContent = categorie;
}

// Soumettre une inscription
function submitInscription() {
    // Validation de l'âge
    const age = parseInt(document.getElementById('age').value);
    if (age < 3 || age > 14) {
        alert('L\'âge doit être compris entre 3 et 14 ans');
        return;
    }
    
    // Récupérer l'inscripteur
    let inscripteur = null;
    const inscripteurType = document.querySelector('input[name="inscripteurType"]:checked').value;
    
    if (inscripteurType === 'personnel') {
        // Vérifier qu'un personnel est sélectionné
        const activeItem = document.querySelector('.inscripteur-item.active');
        if (!activeItem) {
            alert('Veuillez sélectionner un membre du personnel en cliquant sur son nom dans la liste');
            return;
        }
        
        // Récupérer le code depuis l'élément sélectionné
        const code = activeItem.dataset.code;
        const personnel = personnels.find(p => p.code === code);
        
        if (!personnel) {
            alert('Erreur: Membre du personnel non trouvé');
            return;
        }
        
        inscripteur = {
            code: personnel.code,
            nom: personnel.nom,
            poste: personnel.poste
        };
    } else {
        // Personne extérieure
        const externalName = document.getElementById('externalName').value.trim();
        if (!externalName) {
            alert('Veuillez saisir le nom de la personne extérieure');
            return;
        }
        
        inscripteur = {
            code: "EXT-" + Date.now().toString().slice(-6),
            nom: externalName,
            poste: "Personne extérieure"
        };
    }
    
    // Récupérer les données du formulaire
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
    
    // Validation des champs obligatoires
    if (!formData.nom || !formData.sexe || !formData.telephone || !formData.parent || !formData.taille) {
        alert('Veuillez remplir tous les champs obligatoires (*)');
        return;
    }
    
    if (formData.montant < 500) {
        alert('Le montant minimum est de 500 F CFA');
        return;
    }
    
    // Ajouter l'inscription
    inscriptions.push(formData);
    saveInscriptions();
    
    // Afficher la confirmation
    showConfirmation(formData);
    
    // Réinitialiser le formulaire
    document.getElementById('formInscription').reset();
    
    // Réinitialiser les sélections
    document.querySelectorAll('.inscripteur-item.active').forEach(item => {
        item.classList.remove('active');
    });
    
    const inscripteurId = document.getElementById('inscripteurId');
    const inscripteurPoste = document.getElementById('inscripteurPoste');
    if (inscripteurId) inscripteurId.value = '';
    if (inscripteurPoste) inscripteurPoste.value = '';
    
    updateAgeCategory();
    
    // Masquer les sections optionnelles
    const montantLibre = document.getElementById('montantLibre');
    const externalInscripteur = document.getElementById('externalInscripteur');
    if (montantLibre) montantLibre.style.display = 'none';
    if (externalInscripteur) externalInscripteur.style.display = 'none';
    
    // Re-sélectionner "personnel" comme type d'inscripteur par défaut
    const personnelRadio = document.querySelector('input[name="inscripteurType"][value="personnel"]');
    if (personnelRadio) personnelRadio.checked = true;
    
    // Mettre à jour les statistiques
    updateStatistics();
    updateCharts();
}

// Obtenir le montant sélectionné
function getSelectedMontant() {
    const selected = document.querySelector('input[name="montant"]:checked');
    if (!selected) return 0;
    
    if (selected.value === 'autre') {
        const autreInput = document.getElementById('montantAutre');
        return parseFloat(autreInput ? autreInput.value : 0) || 0;
    }
    return parseFloat(selected.value);
}

// Afficher la confirmation d'inscription
function showConfirmation(data) {
    const modal = document.getElementById('confirmationModal');
    const message = document.getElementById('confirmationMessage');
    const recap = document.getElementById('recapDetails');
    
    if (!modal || !message || !recap) return;
    
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
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Imprimer le récapitulatif
function printRecap() {
    const printContent = document.querySelector('.modal-body');
    if (!printContent) return;
    
    const originalContent = document.body.innerHTML;
    const printHTML = printContent.innerHTML;
    
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
                ${printHTML}
            </body>
        </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    location.reload();
}

// Charger la liste des inscriptions
function loadInscriptionsList() {
    const tbody = document.getElementById('listeBody');
    if (!tbody) return;
    
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
    
    // Trier par date (les plus récentes en premier)
    inscriptions.sort((a, b) => new Date(b.dateInscription) - new Date(a.dateInscription));
    
    // Ajouter chaque inscription au tableau
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
    
    // Mettre à jour l'affichage
    const totalInscritsEl = document.getElementById('totalInscrits');
    const totalMontantEl = document.getElementById('totalMontant');
    const totalTshirtsEl = document.getElementById('totalTshirts');
    const totalInscripteursEl = document.getElementById('totalInscripteurs');
    
    if (totalInscritsEl) totalInscritsEl.textContent = totalInscrits;
    if (totalMontantEl) totalMontantEl.textContent = `${totalMontant.toLocaleString()} F`;
    if (totalTshirtsEl) totalTshirtsEl.textContent = totalTshirts;
    if (totalInscripteursEl) totalInscripteursEl.textContent = inscripteurs.size;
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
        
        const cells = row.cells;
        if (cells.length >= 9) {
            const inscripteurCell = cells[8];
            const inscripteurText = inscripteurCell.textContent || inscripteurCell.innerText;
            row.style.display = inscripteurText.includes(selectedCode) ? '' : 'none';
        }
    });
}

// Rechercher une inscription pour modification
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
    const tshirtDetails = document.querySelector('.tshirt-details');
    if (tshirtDetails) {
        tshirtDetails.style.display = inscription.tshirt.recu ? 'block' : 'none';
    }
}

// Mettre à jour une inscription
function updateInscription() {
    const index = inscriptions.findIndex(ins => ins.id === currentEditId);
    
    if (index === -1) {
        alert('Inscription non trouvée');
        return;
    }
    
    // Mettre à jour les données
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

// ==================== GESTION DU PERSONNEL ====================

// Charger les personnels
function loadPersonnels() {
    // Mettre à jour la liste dans le formulaire d'inscription
    const inscripteurList = document.getElementById('inscripteurList');
    const filterInscripteur = document.getElementById('filterInscripteur');
    
    if (inscripteurList) {
        inscripteurList.innerHTML = '';
    }
    
    if (filterInscripteur) {
        filterInscripteur.innerHTML = '<option value="">Tous les inscripteurs</option>';
    }
    
    // Filtrer les personnels actifs
    const personnelsActifs = personnels.filter(p => p.statut === 'actif');
    
    if (personnelsActifs.length === 0) {
        if (inscripteurList) {
            inscripteurList.innerHTML = '<p class="no-personnel" style="text-align: center; color: #666; padding: 20px;">Aucun membre du personnel disponible</p>';
        }
    } else {
        // Ajouter chaque personnel à la liste de sélection
        personnelsActifs.forEach(personnel => {
            // Pour la liste de sélection dans le formulaire
            if (inscripteurList) {
                const item = document.createElement('div');
                item.className = 'inscripteur-item';
                item.dataset.code = personnel.code;
                item.innerHTML = `
                    <h4>${personnel.nom}</h4>
                    <p>${personnel.code} - ${personnel.poste}</p>
                `;
                
                item.addEventListener('click', function() {
                    // Retirer la classe active de tous les éléments
                    document.querySelectorAll('.inscripteur-item').forEach(i => {
                        i.classList.remove('active');
                    });
                    
                    // Ajouter la classe active à l'élément cliqué
                    this.classList.add('active');
                    
                    // Remplir les champs du formulaire
                    document.getElementById('inscripteurId').value = `${personnel.code} - ${personnel.nom}`;
                    document.getElementById('inscripteurPoste').value = personnel.poste;
                    
                    console.log('Personnel sélectionné:', personnel);
                });
                
                inscripteurList.appendChild(item);
            }
            
            // Pour le filtre dans la liste des inscriptions
            if (filterInscripteur) {
                const option = document.createElement('option');
                option.value = personnel.code;
                option.textContent = `${personnel.code} - ${personnel.nom}`;
                filterInscripteur.appendChild(option);
            }
        });
    }
    
    // Mettre à jour la liste du personnel dans l'onglet "Personnels"
    const personnelListBody = document.getElementById('personnelListBody');
    if (personnelListBody) {
        personnelListBody.innerHTML = '';
        
        personnels.forEach(personnel => {
            // Compter les inscriptions de ce personnel
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
    }
    
    // Mettre à jour les statistiques du personnel
    updatePersonnelStats();
}

// Recherche de personnel dans la liste de sélection
function searchPersonnelInList() {
    const searchTerm = document.getElementById('searchInscripteur').value.toLowerCase();
    const items = document.querySelectorAll('.inscripteur-item');
    
    let foundAny = false;
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = '';
            foundAny = true;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Si aucun résultat, afficher un message
    if (!foundAny && items.length > 0) {
        const inscripteurList = document.getElementById('inscripteurList');
        if (inscripteurList) {
            inscripteurList.innerHTML = '<p class="no-results" style="text-align: center; color: #666; padding: 20px;">Aucun résultat trouvé</p>';
        }
    }
}

// Filtrer le personnel dans la table
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
    
    // Créer le nouveau personnel
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

// Éditer un personnel
function editPersonnel(id) {
    console.log('Édition du personnel ID:', id);
    
    const personnel = personnels.find(p => p.id === id);
    if (!personnel) {
        alert('Membre non trouvé');
        return;
    }
    
    currentEditPersonnelId = id;
    
    // Remplir le formulaire du modal
    document.getElementById('editPersonnelId').value = id;
    document.getElementById('editPersonnelNom').value = personnel.nom;
    document.getElementById('editPersonnelCode').value = personnel.code;
    document.getElementById('editPersonnelPoste').value = personnel.poste;
    document.getElementById('editPersonnelTelephone').value = personnel.telephone || '';
    document.getElementById('editPersonnelStatut').value = personnel.statut;
    
    // Afficher le modal
    const modal = document.getElementById('editPersonnelModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Cacher le modal d'édition du personnel
function hideEditPersonnelModal() {
    const modal = document.getElementById('editPersonnelModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    currentEditPersonnelId = null;
    
    // Réinitialiser le formulaire
    const form = document.getElementById('formEditPersonnel');
    if (form) {
        form.reset();
    }
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
        dateModification: new Date().toISOString()
    };
    
    savePersonnels();
    loadPersonnels();
    hideEditPersonnelModal();
    
    alert('Membre du personnel mis à jour avec succès !');
}

// Supprimer un personnel depuis le modal
function deletePersonnelModal() {
    const id = parseInt(document.getElementById('editPersonnelId').value);
    
    if (!id) {
        alert('ID du membre non trouvé');
        return;
    }
    
    confirmDeletePersonnel(id);
}

// Confirmer la suppression d'un personnel
function confirmDeletePersonnel(id) {
    const personnel = personnels.find(p => p.id === id);
    if (!personnel) {
        alert('Membre non trouvé');
        return;
    }
    
    // Vérifier s'il a des inscriptions
    const inscriptionsPersonnel = inscriptions.filter(i => 
        i.inscripteur && i.inscripteur.code === personnel.code
    );
    
    let message = `Êtes-vous sûr de vouloir supprimer "${personnel.nom}" ?`;
    if (inscriptionsPersonnel.length > 0) {
        message = `Ce membre a ${inscriptionsPersonnel.length} inscription(s).\n${message}`;
    }
    
    if (confirm(message)) {
        // Supprimer le personnel
        const index = personnels.findIndex(p => p.id === id);
        if (index !== -1) {
            personnels.splice(index, 1);
            savePersonnels();
            loadPersonnels();
            
            // Fermer le modal si ouvert
            hideEditPersonnelModal();
            
            alert('Membre du personnel supprimé avec succès !');
        }
    }
}

// Mettre à jour les statistiques du personnel
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
    
    // Mettre à jour l'affichage
    const totalPersonnelEl = document.getElementById('totalPersonnel');
    const personnelActifsEl = document.getElementById('personnelActifs');
    const totalInscriptionsPersonnelEl = document.getElementById('totalInscriptionsPersonnel');
    const totalCollectePersonnelEl = document.getElementById('totalCollectePersonnel');
    
    if (totalPersonnelEl) totalPersonnelEl.textContent = totalPersonnel;
    if (personnelActifsEl) personnelActifsEl.textContent = personnelActifs;
    if (totalInscriptionsPersonnelEl) totalInscriptionsPersonnelEl.textContent = totalInscriptionsPersonnel;
    if (totalCollectePersonnelEl) totalCollectePersonnelEl.textContent = `${totalCollectePersonnel.toLocaleString()} F`;
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
    // Vérifier que Chart.js est chargé
    if (typeof Chart === 'undefined') {
        console.error('Chart.js n\'est pas chargé');
        return;
    }
    
    // Créer les graphiques
    window.charts = {
        sexe: new Chart(document.getElementById('chartSexe'), {
            type: 'doughnut',
            data: {
                labels: ['Garçons', 'Filles'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#3498db', '#e84393']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        }),
        age: new Chart(document.getElementById('chartAge'), {
            type: 'bar',
            data: {
                labels: ['3-4 ans', '5-6 ans', '7-8 ans', '9-10 ans', '11-12 ans', '13-14 ans'],
                datasets: [{
                    label: 'Nombre d\'enfants',
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: ['#74b9ff', '#55efc4', '#ffeaa7', '#fab1a0', '#a29bfe', '#fd79a8']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        }),
        montants: new Chart(document.getElementById('chartMontants'), {
            type: 'pie',
            data: {
                labels: ['1 000 F', '1 500 F', '2 000 F', '2 500 F', 'Autre'],
                datasets: [{
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: ['#00b894', '#00cec9', '#0984e3', '#6c5ce7', '#fdcb6e']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        }),
        inscripteurs: new Chart(document.getElementById('chartInscripteurs'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Nombre d\'inscriptions',
                    data: [],
                    backgroundColor: '#1e3c72'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        })
    };
    
    updateCharts();
}

// Mettre à jour les graphiques
function updateCharts() {
    if (!window.charts || inscriptions.length === 0) {
        // Afficher un message par défaut si pas de données
        const chartContainers = document.querySelectorAll('.chart-container');
        chartContainers.forEach(container => {
            if (!container.querySelector('.no-data')) {
                container.innerHTML = '<div class="no-data" style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-style: italic;">Aucune donnée disponible</div>';
            }
        });
        return;
    }
    
    // Graphique sexe
    const garcons = inscriptions.filter(ins => ins.sexe === 'Garçon').length;
    const filles = inscriptions.filter(ins => ins.sexe === 'Fille').length;
    
    if (window.charts.sexe) {
        window.charts.sexe.data.datasets[0].data = [garcons, filles];
        window.charts.sexe.update();
    }
    
    // Graphique âge
    const categoriesAge = ['3-4', '5-6', '7-8', '9-10', '11-12', '13-14'];
    const agesData = categoriesAge.map(cat => {
        const [min, max] = cat.split('-').map(Number);
        return inscriptions.filter(ins => ins.age >= min && ins.age <= max).length;
    });
    
    if (window.charts.age) {
        window.charts.age.data.datasets[0].data = agesData;
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
        window.charts.montants.data.datasets[0].data = montantsData;
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
        .map(ins => ins.nom.split(' ')[0]); // Prendre seulement le prénom
    
    const inscripteursData = Object.values(inscripteursStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(ins => ins.count);
    
    if (window.charts.inscripteurs) {
        window.charts.inscripteurs.data.labels = inscripteursLabels;
        window.charts.inscripteurs.data.datasets[0].data = inscripteursData;
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
    
    try {
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
        XLSX.writeFile(wb, `oppe_inscriptions_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        alert('Export Excel terminé avec succès !');
    } catch (error) {
        alert('Erreur lors de l\'export Excel: ' + error.message);
    }
}

// Export vers CSV
function exportToCSV() {
    if (inscriptions.length === 0) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    try {
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
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `oppe_inscriptions_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert('Export CSV terminé avec succès !');
    } catch (error) {
        alert('Erreur lors de l\'export CSV: ' + error.message);
    }
}

// Sauvegarder les données
function backupData() {
    try {
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
    } catch (error) {
        alert('Erreur lors de la sauvegarde: ' + error.message);
    }
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
    if (!reportWindow) {
        alert('Veuillez autoriser les popups pour afficher le rapport');
        return;
    }
    
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
        <!DOCTYPE html>
        <html>
        <head>
            <title>Rapport OPPE 2026</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #1e3c72; border-bottom: 2px solid #1e3c72; padding-bottom: 10px; }
                h2 { color: #1e3c72; margin-top: 30px; }
                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
                .stat-card { background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; }
                .stat-card h3 { color: #1e3c72; margin: 0 0 10px 0; }
                .stat-number { font-size: 2.5em; font-weight: bold; color: #1e3c72; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background: #1e3c72; color: white; padding: 10px; text-align: left; }
                td { border: 1px solid #ddd; padding: 10px; }
                .total-row { font-weight: bold; background: #f0f0f0; }
                .personnel-table { margin-top: 30px; }
                @media print {
                    .no-print { display: none; }
                    body { padding: 10px; }
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
            
            <div class="no-print" style="margin-top: 30px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #1e3c72; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimer le rapport</button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Fermer</button>
            </div>
        </body>
        </html>
    `);
    
    reportWindow.document.close();
}

// Imprimer la synthèse
function printSummary() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Veuillez autoriser les popups pour imprimer la synthèse');
        return;
    }
    
    const stats = {
        total: inscriptions.length,
        totalMontant: inscriptions.reduce((sum, ins) => sum + ins.montant, 0),
        tshirtsRecus: inscriptions.filter(ins => ins.tshirt.recu).length
    };
    
    printWindow.document.write(`
        <!DOCTYPE html>
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
    
    printWindow.document.close();
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
    setTimeout(() => {
        window.location.reload();
    }, 1000);
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
    const modal = document.getElementById('passwordModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function hidePasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Réinitialiser les champs
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (currentPassword) currentPassword.value = '';
    if (newPassword) newPassword.value = '';
    if (confirmPassword) confirmPassword.value = '';
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
    try {
        localStorage.setItem('oppe_inscriptions_2026', JSON.stringify(inscriptions));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des inscriptions:', error);
        alert('Erreur lors de la sauvegarde des données. L\'espace de stockage est peut-être plein.');
    }
}

function savePersonnels() {
    try {
        localStorage.setItem('oppe_personnels_2026', JSON.stringify(personnels));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du personnel:', error);
        alert('Erreur lors de la sauvegarde des données. L\'espace de stockage est peut-être plein.');
    }
}

// ==================== DÉBOGAGE ET TESTS ====================

// Fonction pour tester l'application
function testApplication() {
    console.log('=== TEST DE L\'APPLICATION OPPE ===');
    console.log('Inscriptions:', inscriptions.length);
    console.log('Personnels:', personnels.length);
    console.log('LocalStorage:', {
        inscriptions: localStorage.getItem('oppe_inscriptions_2026')?.length || 0,
        personnels: localStorage.getItem('oppe_personnels_2026')?.length || 0
    });
    
    // Test de sélection de personnel
    if (personnels.length > 0) {
        console.log('Premier personnel:', personnels[0]);
    }
    
    // Test des graphiques
    if (window.charts) {
        console.log('Graphiques initialisés:', Object.keys(window.charts));
    }
}

// Exécuter le test au chargement (optionnel)
// setTimeout(testApplication, 1000);

// Exporter les fonctions pour la console
window.testApplication = testApplication;
window.editPersonnel = editPersonnel;
window.confirmDeletePersonnel = confirmDeletePersonnel;

console.log('Script OPPE chargé avec succès');
