document.addEventListener('DOMContentLoaded', () => {
    const postBtn = document.getElementById('postBtn');
    const composerInput = document.querySelector('.composer-input');
    const feedContainer = document.getElementById('feedContainer');
    const mediaInput = document.getElementById('mediaInput');
    const mediaPreview = document.getElementById('mediaPreview');
    const composer = document.getElementById('composer');

    // Admin Mode Check
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    
    if (isAdmin) {
        composer.style.display = 'block';
        
        // Add Export JSON button in admin mode
        const toolbarRight = document.querySelector('.toolbar-right');
        if (toolbarRight) {
            const exportBtn = document.createElement('button');
            exportBtn.className = 'tool-btn';
            exportBtn.id = 'exportBtn';
            exportBtn.innerText = 'Export JSON';
            exportBtn.title = 'Copy posts code for blog_data.js';
            exportBtn.style.marginRight = '10px';
            exportBtn.style.padding = '0.5rem 1rem';
            exportBtn.style.borderRadius = '30px';
            exportBtn.style.border = '1px solid var(--surface-border)';
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const staticPosts = typeof STATIC_BLOG_POSTS !== 'undefined' ? STATIC_BLOG_POSTS : [];
                const localPosts = JSON.parse(localStorage.getItem('blog_posts') || '[]');
                
                const allPostsMap = new Map();
                staticPosts.forEach(p => allPostsMap.set(p.id, p));
                localPosts.forEach(p => allPostsMap.set(p.id, p));
                
                const deletedIds = JSON.parse(localStorage.getItem('deleted_static_posts') || '[]');
                const posts = Array.from(allPostsMap.values())
                    .filter(p => !deletedIds.includes(p.id))
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                const exportedCode = `const STATIC_BLOG_POSTS = ${JSON.stringify(posts, null, 4)};`;
                navigator.clipboard.writeText(exportedCode).then(() => {
                    alert('Static blog posts code copied to clipboard! You can paste it directly into blog_data.js.');
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    console.log(exportedCode);
                    alert('Exported code printed to browser console (failed to copy to clipboard).');
                });
            });
            toolbarRight.prepend(exportBtn);
        }
    } else {
        composer.style.display = 'none';
    }

    let currentMedia = null;
    let currentMediaType = null; // 'image', 'video', 'pdf'
    let currentMediaName = null;

    // Load posts
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
        const titleInput = document.getElementById('postTitle');
        const title = titleInput.value.trim();
        const content = composerInput.innerHTML;
        const textContent = composerInput.innerText.trim();

        if (!textContent && !currentMedia && !title) return;

        const post = {
            id: Date.now(),
            title: title,
            content: content,
            media: currentMedia,
            mediaType: currentMediaType,
            mediaName: currentMediaName,
            timestamp: new Date().toISOString(),
            author: "Hanbo Song"
        };

        savePost(post);
        loadPosts(); // Re-render entire feed to get month headers correct

        // Reset composer
        titleInput.value = '';
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
        const staticPosts = typeof STATIC_BLOG_POSTS !== 'undefined' ? STATIC_BLOG_POSTS : [];
        const localPosts = JSON.parse(localStorage.getItem('blog_posts') || '[]');
        
        const allPostsMap = new Map();
        staticPosts.forEach(p => allPostsMap.set(p.id, p));
        localPosts.forEach(p => allPostsMap.set(p.id, p));
        
        const deletedIds = JSON.parse(localStorage.getItem('deleted_static_posts') || '[]');
        const posts = Array.from(allPostsMap.values())
            .filter(p => !deletedIds.includes(p.id))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        feedContainer.innerHTML = '';
        
        let currentMonthYear = "";
        posts.forEach(post => {
            const postDate = new Date(post.timestamp);
            const monthYear = postDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
            
            if (monthYear !== currentMonthYear) {
                currentMonthYear = monthYear;
                const header = document.createElement('h2');
                header.className = 'archive-month-title';
                header.innerText = monthYear;
                feedContainer.appendChild(header);
            }
            
            const article = renderPost(post);
            feedContainer.appendChild(article);
        });
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
        let localPosts = JSON.parse(localStorage.getItem('blog_posts') || '[]');
        const isLocal = localPosts.some(p => p.id === id);
        if (isLocal) {
            localPosts = localPosts.filter(p => p.id !== id);
            localStorage.setItem('blog_posts', JSON.stringify(localPosts));
        } else {
            const deletedIds = JSON.parse(localStorage.getItem('deleted_static_posts') || '[]');
            if (!deletedIds.includes(id)) {
                deletedIds.push(id);
                localStorage.setItem('deleted_static_posts', JSON.stringify(deletedIds));
            }
        }
        loadPosts(); // Re-render feed
    }

    function renderPost(post) {
        // Only show date, no time
        const date = new Date(post.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const article = document.createElement('article');
        article.className = 'blog-post';
        article.onclick = () => window.location.href = `post.html?id=${post.id}${isAdmin ? '&admin=true' : ''}`;

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
                mediaHTML = `<div class="post-media"><img src="${post.media}" alt="Post media"></div>`;
            }
        }

        const titleHTML = post.title ? `<h2 class="post-title">${post.title}</h2>` : '';
        const deleteBtnHTML = isAdmin ? `
            <button class="delete-btn" title="Delete post">
                <img src="Images/delete_icon.png" alt="Delete">
            </button>
        ` : '';

        article.innerHTML = `
            <div class="post-content">
                <div class="post-header">
                    <div class="post-info">
                        <span class="post-author">${post.author}</span>
                        <span class="post-date">· ${date}</span>
                    </div>
                    ${deleteBtnHTML}
                </div>
                ${titleHTML}
                <div class="post-body">
                    ${post.content}
                </div>
                ${mediaHTML}
            </div>
        `;

        if (isAdmin) {
            // Attach delete event listener
            const deleteBtn = article.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => openDeleteModal(e, post.id));
        }

        return article;
    }
});
