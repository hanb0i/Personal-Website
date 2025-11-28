document.addEventListener('DOMContentLoaded', () => {
    const postBtn = document.getElementById('postBtn');
    const composerInput = document.querySelector('.composer-input');
    const feedContainer = document.getElementById('feedContainer');
    const mediaInput = document.getElementById('mediaInput');
    const mediaPreview = document.getElementById('mediaPreview');
    const composer = document.getElementById('composer');

    // Admin Mode Check
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        composer.style.display = 'flex';
    }

    let currentMedia = null;
    let currentMediaType = null; // 'image', 'video', 'pdf'
    let currentMediaName = null;

    // Load posts from localStorage
    loadPosts();

    // Handle Media Upload
    mediaInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentMedia = e.target.result;
                currentMediaName = file.name;

                if (file.type.startsWith('image/')) {
                    currentMediaType = 'image';
                    mediaPreview.innerHTML = `<img src="${currentMedia}" alt="Upload preview">`;
                } else if (file.type.startsWith('video/')) {
                    currentMediaType = 'video';
                    mediaPreview.innerHTML = `<video controls src="${currentMedia}"></video>`;
                } else if (file.type === 'application/pdf') {
                    currentMediaType = 'pdf';
                    mediaPreview.innerHTML = `
                        <div class="pdf-preview">
                            <span>📄 ${file.name}</span>
                        </div>`;
                }

                mediaPreview.innerHTML += `<button class="remove-media" onclick="this.parentElement.innerHTML=''; currentMedia=null; currentMediaType=null; currentMediaName=null;">×</button>`;
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle Post Creation
    postBtn.addEventListener('click', () => {
        const content = composerInput.innerHTML;
        const textContent = composerInput.innerText.trim();

        if (!textContent && !currentMedia) return;

        const post = {
            id: Date.now(),
            content: content,
            media: currentMedia,
            mediaType: currentMediaType,
            mediaName: currentMediaName,
            timestamp: new Date().toISOString(),
            author: "Hanbo Song"
            // Avatar removed
        };

        savePost(post);
        renderPost(post, true); // Add to top

        // Reset composer
        composerInput.innerHTML = '';
        mediaPreview.innerHTML = '';
        currentMedia = null;
        currentMediaType = null;
        currentMediaName = null;
        mediaInput.value = ''; // Reset file input
    });

    function savePost(post) {
        const posts = JSON.parse(localStorage.getItem('blog_posts') || '[]');
        posts.unshift(post);
        localStorage.setItem('blog_posts', JSON.stringify(posts));
    }

    function loadPosts() {
        const posts = JSON.parse(localStorage.getItem('blog_posts') || '[]');
        feedContainer.innerHTML = '';
        posts.forEach(post => renderPost(post));
    }

    // Modal Elements
    const modal = document.getElementById('deleteModal');
    const cancelBtn = document.getElementById('cancelDelete');
    const confirmBtn = document.getElementById('confirmDelete');
    let postToDeleteId = null;

    // Modal Event Listeners
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    confirmBtn.addEventListener('click', () => {
        if (postToDeleteId) {
            deletePost(postToDeleteId);
            closeModal();
        }
    });

    function openDeleteModal(e, id) {
        e.stopPropagation(); // Prevent navigating to post
        postToDeleteId = id;
        modal.style.display = 'flex';
    }

    function closeModal() {
        modal.style.display = 'none';
        postToDeleteId = null;
    }

    function deletePost(id) {
        let posts = JSON.parse(localStorage.getItem('blog_posts') || '[]');
        posts = posts.filter(p => p.id !== id);
        localStorage.setItem('blog_posts', JSON.stringify(posts));
        loadPosts(); // Re-render feed
    }

    function renderPost(post, prepend = false) {
        // Only show date, no time
        const date = new Date(post.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const article = document.createElement('article');
        article.className = 'blog-post';
        article.onclick = () => window.location.href = `post.html?id=${post.id}`;

        let mediaHTML = '';
        if (post.media) {
            if (post.mediaType === 'video') {
                mediaHTML = `<div class="post-media"><video controls src="${post.media}"></video></div>`;
            } else if (post.mediaType === 'pdf') {
                mediaHTML = `
                    <div class="post-media">
                        <a href="${post.media}" download="${post.mediaName}" class="pdf-attachment" onclick="event.stopPropagation()">
                            📄 ${post.mediaName || 'Document.pdf'}
                        </a>
                    </div>`;
            } else {
                // Default to image for backward compatibility or explicit image type
                mediaHTML = `<div class="post-media"><img src="${post.media}" alt="Post media"></div>`;
            }
        }

        article.innerHTML = `
            <div class="post-content">
                <div class="post-header">
                    <div class="post-info">
                        <span class="post-author">${post.author}</span>
                        <span class="post-date">· ${date}</span>
                    </div>
                    <button class="delete-btn" title="Delete post">
                        <img src="Images/delete_icon.png" alt="Delete">
                    </button>
                </div>
                <div class="post-body">
                    ${post.content}
                </div>
                ${mediaHTML}
            </div>
        `;

        // Attach delete event listener
        const deleteBtn = article.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => openDeleteModal(e, post.id));

        if (prepend) {
            feedContainer.prepend(article);
        } else {
            feedContainer.appendChild(article);
        }
    }
});
