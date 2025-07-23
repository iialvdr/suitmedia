document.addEventListener('DOMContentLoaded', () => {
    const mainHeader = document.getElementById('main-header');
    const banner = document.getElementById('banner');
    const postsGrid = document.getElementById('posts-grid');
    const showPerPageSelect = document.getElementById('show-per-page');
    const sortBySelect = document.getElementById('sort-by');
    const showingStartSpan = document.getElementById('showing-start');
    const showingEndSpan = document.getElementById('showing-end');
    const totalItemsSpan = document.getElementById('total-items');
    const paginationContainer = document.querySelector('.pagination');

    let lastScrollY = 0;
    // Load state from localStorage or set defaults
    let currentSort = localStorage.getItem('sort') || '-published_at';
    let currentPageSize = parseInt(localStorage.getItem('pageSize')) || 10;
    let currentPageNumber = parseInt(localStorage.getItem('pageNumber')) || 1;
    let totalPosts = 0; // Will be updated from API

    // --- Header Hide/Show & Transparency ---
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // Hide/Show logic
        if (currentScrollY > lastScrollY && currentScrollY > 100) { // Scroll down
            mainHeader.classList.add('hidden');
        } else if (currentScrollY < lastScrollY || currentScrollY <= 100) { // Scroll up or at top
            mainHeader.classList.remove('hidden');
        }

        // Transparency logic
        if (currentScrollY > 50) { // Add scrolled class after a bit of scroll
            mainHeader.classList.add('scrolled');
        } else {
            mainHeader.classList.remove('scrolled');
        }

        lastScrollY = currentScrollY;

        // --- Banner Parallax Effect ---
        // Adjust background position based on scroll to create parallax
        // You might need to fine-tune the multiplier (e.g., 0.3) for desired effect
        banner.style.backgroundPositionY = -currentScrollY * 0.3 + 'px';
        // If you want content to move differently:
        // banner.querySelector('.banner-content').style.transform = `translateY(${currentScrollY * 0.1}px)`;
    });

    // --- API Configuration ---
    // PENTING: Untuk pengembangan lokal, kita akan menggunakan PROXY SERVER.
    // Pastikan server.js berjalan di http://localhost:3000
    const API_BASE_URL = '/api/ideas'; 

    // --- Fetch Posts Function ---
    async function fetchPosts() {
        postsGrid.innerHTML = ''; // Clear existing posts
        // Add skeleton loaders for a better UX while loading
        for (let i = 0; i < currentPageSize; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.classList.add('card', 'skeleton');
            postsGrid.appendChild(skeletonCard);
        }

        const params = new URLSearchParams({
            'page[number]': currentPageNumber,
            'page[size]': currentPageSize,
            'sort': currentSort
        });
        // Append multiple values for 'append[]' parameter as per API requirement
        params.append('append[]', 'small_image');
        params.append('append[]', 'medium_image');


        try {
            const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
            if (!response.ok) {
                // If response is not OK (e.g., 404, 500), throw an error
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json(); // Parse JSON response
            renderPosts(data.data); // Render the fetched posts
            updatePagination(data.meta.pagination); // Update pagination controls
        } catch (error) {
            console.error('Error fetching posts:', error);
            postsGrid.innerHTML = '<p style="text-align: center; color: #cc0000;">Failed to load posts. Please try again later.</p>';
            paginationContainer.innerHTML = ''; // Clear pagination if error
            showingStartSpan.textContent = '0';
            showingEndSpan.textContent = '0';
            totalItemsSpan.textContent = '0';
        }
    }

    // --- Render Posts Function ---
    function renderPosts(posts) {
        postsGrid.innerHTML = ''; // Clear skeletons before rendering actual posts
        if (posts.length === 0) {
            postsGrid.innerHTML = '<p style="text-align: center; color: #555;">No posts found matching your criteria.</p>';
            return;
        }

        posts.forEach(post => {
            const card = document.createElement('div');
            card.classList.add('card');

            // Safely get image URL, fallback to a placeholder if not available
            const imageUrl = post.small_image && post.small_image[0] && post.small_image[0].url
                             ? post.small_image[0].url
                             : 'https://via.placeholder.com/400x225?text=No+Image';
            
            // Format date
            const postDate = new Date(post.published_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            card.innerHTML = `
                <div class="card-image">
                    <img data-src="${imageUrl}" alt="${post.title}" loading="lazy">
                </div>
                <div class="card-content">
                    <div class="card-date">${postDate}</div>
                    <h3 class="card-title">${post.title}</h3>
                </div>
            `;
            postsGrid.appendChild(card);
        });

        applyLazyLoad(); // Manually trigger lazy load for newly added images
    }

    // --- Lazy Loading (Intersection Observer) ---
    // Creates an IntersectionObserver to detect when images enter the viewport
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src; // Set the actual image source
                img.removeAttribute('data-src'); // Remove data-src to prevent re-loading
                img.onload = () => { // Optional: Remove skeleton class after load if you add it directly to img
                    img.classList.remove('skeleton-image'); 
                };
                observer.unobserve(img); // Stop observing once image is loaded
            }
        });
    }, {
        rootMargin: '0px 0px 100px 0px' // Load images when they are 100px from viewport
    });

    // Applies lazy loading to all images with data-src attribute
    function applyLazyLoad() {
        document.querySelectorAll('.card-image img[data-src]').forEach(img => {
            observer.observe(img);
        });
    }

    // --- Update Pagination & Showing Info ---
    function updatePagination(paginationMeta) {
        totalPosts = paginationMeta.total;
        const totalPages = paginationMeta.last_page;
        const currentPage = paginationMeta.current_page;

        // Update showing X - Y of Z items
        showingStartSpan.textContent = (currentPage - 1) * currentPageSize + 1;
        showingEndSpan.textContent = Math.min(currentPage * currentPageSize, totalPosts);
        totalItemsSpan.textContent = totalPosts;

        paginationContainer.innerHTML = ''; // Clear existing pagination buttons

        // Don't show pagination if there's only one page
        if (totalPages <= 1) {
            return;
        }

        // Previous button
        if (currentPage > 1) {
            paginationContainer.innerHTML += `<button class="page-link" data-page="${currentPage - 1}">&laquo;</button>`;
        }

        // Logic to dynamically show a limited set of page numbers
        const maxPagesToShow = 5; // Max number of page buttons visible (excluding ellipsis)
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        // Adjust start/end if we are near the beginning/end
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        // First page and ellipsis if needed
        if (startPage > 1) {
            paginationContainer.innerHTML += `<button class="page-link" data-page="1">1</button>`;
            if (startPage > 2) paginationContainer.innerHTML += `<span class="ellipsis">...</span>`;
        }

        // Render visible page numbers
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationContainer.innerHTML += `<button class="page-link ${activeClass}" data-page="${i}">${i}</button>`;
        }

        // Last page and ellipsis if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationContainer.innerHTML += `<span class="ellipsis">...</span>`;
            paginationContainer.innerHTML += `<button class="page-link" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        if (currentPage < totalPages) {
            paginationContainer.innerHTML += `<button class="page-link" data-page="${currentPage + 1}">&raquo;</button>`;
        }

        // Add event listeners to newly created pagination buttons
        paginationContainer.querySelectorAll('.page-link').forEach(button => {
            button.addEventListener('click', (event) => {
                const newPage = parseInt(event.target.dataset.page);
                if (newPage !== currentPageNumber) { // Only fetch if page is different
                    currentPageNumber = newPage;
                    localStorage.setItem('pageNumber', currentPageNumber); // Save state
                    fetchPosts();
                }
            });
        });
    }

    // --- Event Listeners for Filters (Show per page & Sort by) ---
    // Set initial selected values based on localStorage
    showPerPageSelect.value = currentPageSize; 
    sortBySelect.value = currentSort; 

    showPerPageSelect.addEventListener('change', (event) => {
        currentPageSize = parseInt(event.target.value);
        currentPageNumber = 1; // Reset to first page when page size changes
        localStorage.setItem('pageSize', currentPageSize); // Save state
        localStorage.setItem('pageNumber', currentPageNumber); // Save state
        fetchPosts();
    });

    sortBySelect.addEventListener('change', (event) => {
        currentSort = event.target.value;
        currentPageNumber = 1; // Reset to first page when sort changes
        localStorage.setItem('sort', currentSort); // Save state
        localStorage.setItem('pageNumber', currentPageNumber); // Save state
        fetchPosts();
    });

    // Initial fetch on page load to populate content
    fetchPosts();
});