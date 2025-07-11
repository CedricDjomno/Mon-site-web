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

document.addEventListener("DOMContentLoaded", () => {
  // ======================
  // 1. INITIALISATIONS
  // ======================
  let currentSpeech = null; // Pour la lecture vocale

  // ======================
  // 2. MODE NUIT
  // ======================
  const toggleModeBtn = document.getElementById("toggle-mode");
  if (toggleModeBtn) {
    toggleModeBtn.addEventListener("click", () => {
      document.body.classList.toggle("nuit");
      localStorage.setItem('darkMode', document.body.classList.contains("nuit"));
    });

    // Restaurer le mode
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add("nuit");
    }
  }

  // ======================
  // 3. SYSTÈME DE LIKES
  // ======================
  document.querySelectorAll(".like-btn").forEach(btn => {
    const storyId = btn.dataset.storyId;
    const likeCount = btn.querySelector(".like-count");

    // Mise à jour en temps réel
    db.collection("stories").doc(storyId).onSnapshot((doc) => {
      likeCount.textContent = doc.data()?.likes || 0;
    });

    // Gestion du clic
    btn.addEventListener("click", () => {
      const storyRef = db.collection("stories").doc(storyId);
      db.runTransaction(async (transaction) => {
        const doc = await transaction.get(storyRef);
        const newLikes = (doc.data()?.likes || 0) + 1;
        transaction.update(storyRef, { likes: newLikes });
      }).catch(console.error);

      // Animation
      btn.classList.add("pulse");
      setTimeout(() => btn.classList.remove("pulse"), 300);
    });
  });

  // ======================
  // 4. COMMENTAIRES
  // ======================
  document.querySelectorAll(".show-comments-btn").forEach(btn => {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      const commentSection = this.closest('.interactions').querySelector('.comment-section');
      const isHidden = window.getComputedStyle(commentSection).display === "none";
      
      // Fermer toutes les autres sections
      document.querySelectorAll('.comment-section').forEach(s => {
        if (s !== commentSection) s.style.display = "none";
      });

      // Basculer l'affichage
      commentSection.style.display = isHidden ? "block" : "none";

      // Charger les commentaires si premier affichage
      if (isHidden && !commentSection.dataset.loaded) {
        loadComments(this.dataset.storyId, commentSection.querySelector(".comments-list"));
        commentSection.dataset.loaded = "true";
      }
    });
  });

  // ======================
  // 5. ENVOI DE COMMENTAIRES
  // ======================
  document.querySelectorAll(".comment-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const storyId = btn.dataset.storyId;
      const commentInput = btn.previousElementSibling;
      const text = commentInput.value.trim();
      
      if (text) {
        db.collection("comments").add({
          storyId,
          text,
          user: auth.currentUser?.email || "Anonyme",
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        commentInput.value = "";
      }
    });
  });

  // ======================
  // 6. FONCTIONNALITÉ DE RECHERCHE AMÉLIORÉE
  // ======================
  const searchInput = document.getElementById("search-input");
  const themeFilter = document.getElementById("theme-filter");
  const searchBtn = document.getElementById("search-btn");

  if (searchInput && themeFilter && searchBtn) {
    const performSearch = () => {
      const searchTerm = searchInput.value.toLowerCase();
      const selectedTheme = themeFilter.value;

      // Feedback visuel pendant la recherche
      searchBtn.textContent = '...';
      searchBtn.disabled = true;

      document.querySelectorAll(".carte").forEach((card, index) => {
        const title = card.querySelector("h2").textContent.toLowerCase();
        const description = card.querySelector("p").textContent.toLowerCase();
        const themes = card.dataset.theme?.split(" ") || [];

        const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
        const matchesTheme = !selectedTheme || themes.includes(selectedTheme);

        card.style.display = matchesSearch && matchesTheme ? "block" : "none";
        
        // Animation retardée pour chaque carte
        if (matchesSearch && matchesTheme) {
          card.style.animationDelay = `${index * 0.05}s`;
          card.style.animationName = 'fadeIn';
        }
      });

      // Réinitialiser le bouton
      setTimeout(() => {
        searchBtn.textContent = 'Chercher';
        searchBtn.disabled = false;
      }, 300);
    };

    // Écouteurs d'événements
    searchBtn.addEventListener("click", performSearch);
    searchInput.addEventListener("keyup", (e) => e.key === "Enter" && performSearch());
    themeFilter.addEventListener("change", performSearch);
  }

  // ======================
  // FONCTIONS UTILITAIRES
  // ======================
  function loadComments(storyId, container) {
    db.collection("comments")
      .where("storyId", "==", storyId)
      .orderBy("timestamp", "desc")
      .onSnapshot((snapshot) => {
        container.innerHTML = "";
        snapshot.forEach(doc => {
          const comment = doc.data();
          const commentDiv = document.createElement("div");
          commentDiv.className = "comment";
          commentDiv.textContent = `${comment.user}: ${comment.text}`;
          container.appendChild(commentDiv);
        });
      });
  }
});