// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC7Sf-tNwFJM3W8NhS0seX7ziswedDoubw",
  authDomain: "histoires-magique.firebaseapp.com",
  projectId: "histoires-magique",
  storageBucket: "histoires-magique.appspot.com",
  messagingSenderId: "716616002326",
  appId: "1:716616002326:web:fb572801eb5869b33dfe37"
};

// Initialisation Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Variables globales
let voixEnCours = null;
let btnLecture = null;
let btnArret = null;

// Génération d'un ID unique persistant pour les invités
function getGuestIdentifier() {
  // Essayer de récupérer l'ID existant
  let guestId = localStorage.getItem('guestIdentifier');
  
  // Si inexistant, en créer un nouveau
  if (!guestId) {
    // Créer un ID complexe avec plusieurs éléments
    guestId = 'guest-' + 
              Date.now().toString(36) + 
              '-' + 
              Math.random().toString(36).substr(2, 6) + 
              '-' + 
              (navigator.hardwareConcurrency || 'nc') + 
              '-' + 
              (screen.width || 'unk');
              
    // Stocker pour les futures visites
    localStorage.setItem('guestIdentifier', guestId);
  }
  
  return guestId;
}

// 🌙 Bascule le mode nuit
document.addEventListener("DOMContentLoaded", () => {
  const bouton = document.getElementById("toggle-mode");
  if (bouton) {
    bouton.addEventListener("click", () => {
      document.body.classList.toggle("nuit");
    });
  }

  // 🎙️ Contrôle de la lecture vocale
  btnLecture = document.getElementById("btn-lecture");
  btnArret = document.getElementById("btn-arret");

  if (btnLecture && btnArret) {
    btnLecture.addEventListener("click", demarrerLecture);
    btnArret.addEventListener("click", arreterLecture);
  }

  // Arrêter la lecture quand on quitte la page
  window.addEventListener("beforeunload", arreterLecture);

  // Initialiser les interactions
  initLikes();
  initComments();
});

function demarrerLecture() {
  const texte = document.getElementById("histoire").textContent;
  
  // Arrête toute lecture en cours
  arreterLecture();
  
  voixEnCours = new SpeechSynthesisUtterance(texte);
  voixEnCours.lang = "fr-FR";
  voixEnCours.rate = 1.02;
  voixEnCours.pitch = 1;
  
  // Gestion des événements
  voixEnCours.onend = function() {
    arreterLecture();
  };
  
  speechSynthesis.speak(voixEnCours);
  
  // Met à jour l'interface
  btnLecture.style.display = "none";
  btnArret.style.display = "block";
}

function arreterLecture() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  
  if (voixEnCours) {
    voixEnCours.onend = null;
    voixEnCours = null;
  }
  
  if (btnLecture && btnArret) {
    btnLecture.style.display = "block";
    btnArret.style.display = "none";
  }
}

// Gestion spéciale pour les navigateurs mobiles
document.addEventListener("visibilitychange", function() {
  if (document.hidden) {
    arreterLecture();
  }
});

// ======================
// SYSTÈME DE LIKES
// ======================
function initLikes() {
  document.querySelectorAll(".like-btn").forEach(btn => {
    const storyId = btn.dataset.storyId;
    const likeCount = btn.querySelector(".like-count");

    // Mise à jour en temps réel
    db.collection("stories").doc(storyId).onSnapshot((doc) => {
      likeCount.textContent = doc.data()?.likes || 0;
    });

    // Gestion du clic
    btn.addEventListener("click", async () => {
      const storyRef = db.collection("stories").doc(storyId);
      try {
        await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(storyRef);
          const newLikes = (doc.data()?.likes || 0) + 1;
          transaction.update(storyRef, { likes: newLikes });
        });

        // Animation
        btn.classList.add("pulse");
        setTimeout(() => btn.classList.remove("pulse"), 300);
      } catch (error) {
        console.error("Erreur lors du like:", error);
      }
    });
  });
}

// ======================
// SYSTÈME DE COMMENTAIRES
// ======================
function initComments() {
  // Afficher/masquer les commentaires
  document.querySelectorAll(".show-comments-btn").forEach(btn => {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      const commentSection = this.closest('.interactions').querySelector('.comment-section');
      const isHidden = window.getComputedStyle(commentSection).display === "none";
      
      // Basculer l'affichage
      commentSection.style.display = isHidden ? "block" : "none";

      // Charger les commentaires si premier affichage
      if (isHidden && !commentSection.dataset.loaded) {
        loadComments(this.dataset.storyId, commentSection.querySelector(".comments-list"));
        updateCommentCount(this.dataset.storyId, this.querySelector(".comment-count"));
        commentSection.dataset.loaded = "true";
      }
    });
  });

  // Envoi de commentaires
  document.querySelectorAll(".comment-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const storyId = btn.dataset.storyId;
      const commentInput = btn.previousElementSibling;
      const text = commentInput.value.trim();
      
      if (text) {
        try {
          const user = auth.currentUser;
          const userIdentifier = user ? user.uid : getGuestIdentifier();
          const userName = user ? `Utilisateur-${user.uid.substr(0, 6)}` : `Visiteur-${userIdentifier.substr(6, 6)}`;
          
          await db.collection("comments").add({
            storyId,
            text,
            userId: userIdentifier,
            userName: userName,
            isGuest: !user,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          commentInput.value = "";
        } catch (error) {
          console.error("Erreur lors de l'ajout du commentaire:", error);
        }
      }
    });
  });
}

function loadComments(storyId, container) {
  db.collection("comments")
    .where("storyId", "==", storyId)
    .onSnapshot((snapshot) => {
      container.innerHTML = "";
      snapshot.forEach(doc => {
        const comment = doc.data();
        const commentDiv = document.createElement("div");
        commentDiv.className = `comment ${comment.isGuest ? 'guest-comment' : 'user-comment'}`;
        
        commentDiv.innerHTML = `
          <div class="comment-header">
            <strong class="comment-author">${comment.userName}</strong>
            ${comment.isGuest ? '<span class="guest-tag"></span>' : ''}
          </div>
          <div class="comment-text">${comment.text}</div>
        `;
        
        container.appendChild(commentDiv);
      });
    });
}

function updateCommentCount(storyId, countElement) {
  db.collection("comments")
    .where("storyId", "==", storyId)
    .onSnapshot((snapshot) => {
      countElement.textContent = `(${snapshot.size})`;
    });
}