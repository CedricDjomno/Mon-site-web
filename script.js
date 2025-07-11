    document.addEventListener("DOMContentLoaded", () => {
      // Gestion de l'affichage des commentaires
      document.querySelectorAll(".show-comments-btn").forEach(btn => {
        btn.addEventListener("click", function() {
          const commentSection = this.closest('.interaction-buttons').nextElementSibling;
          commentSection.style.display = commentSection.style.display === "none" ? "block" : "none";
          
          if (commentSection.dataset.loaded !== "true") {
            const storyId = this.dataset.storyId;
            const commentsList = commentSection.querySelector(".comments-list");
            
            db.collection("comments")
              .where("storyId", "==", storyId)
              .orderBy("timestamp", "desc")
              .onSnapshot((snapshot) => {
                commentsList.innerHTML = "";
                snapshot.forEach(doc => {
                  const comment = doc.data();
                  const commentDiv = document.createElement("div");
                  commentDiv.className = "comment";
                  commentDiv.textContent = `${comment.user}: ${comment.text}`;
                  commentsList.appendChild(commentDiv);
                });
              });
            
            commentSection.dataset.loaded = "true";
          }
        });
      });

      // Gestion des likes
      document.querySelectorAll(".like-btn").forEach(btn => {
        const storyId = btn.dataset.storyId;
        const likeCount = btn.querySelector(".like-count");

        btn.addEventListener("click", () => {
          const storyRef = db.collection("stories").doc(storyId);
          db.runTransaction(async (transaction) => {
            const doc = await transaction.get(storyRef);
            const newLikes = (doc.data()?.likes || 0) + 1;
            transaction.update(storyRef, { likes: newLikes });
            likeCount.textContent = newLikes;
          });
        });

        db.collection("stories").doc(storyId).onSnapshot((doc) => {
          likeCount.textContent = doc.data()?.likes || 0;
        });
      });

      // Gestion des commentaires
      document.querySelectorAll(".comment-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const storyId = btn.dataset.storyId;
          const commentInput = btn.previousElementSibling;
          const text = commentInput.value.trim();
          
          if (text) {
            db.collection("comments").add({
              storyId,
              text,
              user: "Anonyme",
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            commentInput.value = "";
          }
        });
      });

      // Mode nuit
      const bouton = document.getElementById("toggle-mode");
      bouton.addEventListener("click", () => {
        document.body.classList.toggle("nuit");
      });
    });