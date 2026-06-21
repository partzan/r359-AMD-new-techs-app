// State Management
let releaseNotes = [];
const selectedGuids = new Set();
let activeCategory = 'all';
let searchQuery = '';

// Elements
const notesGrid = document.getElementById('notes-grid');
const refreshBtn = document.getElementById('refresh-btn');
const syncStatus = document.getElementById('sync-status');
const statusDot = document.querySelector('.status-dot');
const itemCountText = document.getElementById('item-count');
const tweetDrawer = document.getElementById('tweet-drawer');
const selectionCountBadge = document.getElementById('selection-count');
const tweetTextarea = document.getElementById('tweet-textarea');
const charUsed = document.getElementById('char-used');
const charCounter = document.getElementById('char-counter');
const tweetBtn = document.getElementById('tweet-btn');
const clearSelectionBtn = document.getElementById('clear-selection-btn');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// New UX Elements
const optimizeTweetBtn = document.getElementById('optimize-tweet-btn');
const cacheWarningBanner = document.getElementById('cache-warning-banner');
const cacheTimeText = document.getElementById('cache-time');
const searchInput = document.getElementById('search-input');
const filterCategoriesContainer = document.getElementById('filter-categories');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchNotes(false);
    
    // Event Listeners
    refreshBtn.addEventListener('click', triggerBatStormAndRefresh);
    clearSelectionBtn.addEventListener('click', clearSelection);
    tweetBtn.addEventListener('click', publishTweet);
    optimizeTweetBtn.addEventListener('click', optimizeTweetText);
    searchInput.addEventListener('input', handleSearchInput);
    
    // Live character counting
    tweetTextarea.addEventListener('input', handleTweetInput);
});

// Show notification toast
function showToast(message, isError = false) {
    toastMessage.textContent = message;
    toast.style.background = isError ? '#EF4444' : '#10B981';
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3500);
}

// Format date relative or absolute
function formatDate(dateStr) {
    return dateStr;
}

// Fetch release notes from backend
async function fetchNotes(refresh = false) {
    // UI Feedback: Syncing state
    refreshBtn.classList.add('spinning');
    // Inline continuous spin animation via script since CSS hover is only one-shot
    refreshBtn.style.animation = 'continuous-spin 2s linear infinite';
    
    syncStatus.textContent = 'Syncing...';
    statusDot.className = 'status-dot yellow';
    
    if (refresh) {
        showToast('Fetching latest AMD release notes...');
    }

    try {
        const response = await fetch(`/api/news?refresh=${refresh}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        if (result.status === 'success' || result.status === 'partial_success') {
            releaseNotes = result.data;
            
            // Show warning banner if serving cached data due to API failure/offline fallback
            if (result.status === 'partial_success' || result.source === 'cache_fallback') {
                cacheWarningBanner.style.display = 'flex';
                // Show localized fetch time or fallback
                const timeStr = result.last_fetched || new Date().toLocaleString();
                cacheTimeText.textContent = timeStr;
            } else {
                cacheWarningBanner.style.display = 'none';
            }
            
            // Set up category filters and apply them
            renderCategoryFilters(releaseNotes);
            applyFilters();
            
            syncStatus.textContent = 'Synced';
            statusDot.className = 'status-dot green';
            
            if (refresh) {
                showToast('Release notes updated successfully!');
            }
        } else {
            throw new Error(result.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showToast('Failed to sync. Displaying cached updates.', true);
        syncStatus.textContent = 'Offline (Error)';
        statusDot.className = 'status-dot';
        
        // Show cache warning banner
        cacheWarningBanner.style.display = 'flex';
        cacheTimeText.textContent = 'Stale Local Data';
        
        // If we don't have notes yet, show an error state in grid
        if (releaseNotes.length === 0) {
            notesGrid.innerHTML = `
                <div class="error-state">
                    <p>Failed to load gaming technologies release notes.</p>
                    <button class="retry-btn" onclick="fetchNotes(true)">Retry Fetch</button>
                </div>
            `;
        }
    } finally {
        // Stop spinning
        refreshBtn.classList.remove('spinning');
        refreshBtn.style.animation = '';
    }
}

// Render Notes to Grid
function renderNotes(notes) {
    if (!notes || notes.length === 0) {
        notesGrid.innerHTML = '<div class="empty-state">No release notes found matching your search.</div>';
        return;
    }

    notesGrid.innerHTML = '';
    
    notes.forEach((note) => {
        const isSelected = selectedGuids.has(note.guid);
        const card = document.createElement('div');
        card.className = `note-card ${isSelected ? 'selected' : ''}`;
        card.dataset.guid = note.guid;
        
        // Accessibility attributes for card keyboard navigation
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        
        // Build badges
        const badgesHtml = note.categories && note.categories.length > 0 
            ? note.categories.slice(0, 2).map(cat => `<span class="badge font-mono">${cat.replace(/-/g, ' ')}</span>`).join('')
            : '<span class="badge font-mono">Gaming Tech</span>';
            
        // Build image section (handling fallback)
        let imageHtml = '';
        if (note.image) {
            imageHtml = `<img src="${note.image}" alt="${note.title}" class="card-image" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`;
        }
        const fallbackHtml = `
            <div class="fallback-image-text font-mono" style="${!note.image ? 'display:flex' : 'display:none'}">
                AMD
            </div>
        `;

        card.innerHTML = `
            <div class="card-image-wrapper">
                ${imageHtml}
                ${fallbackHtml}
                <div class="selection-overlay" title="Select this post"></div>
            </div>
            <div class="card-body">
                <div class="card-meta">
                    <div class="card-badges">${badgesHtml}</div>
                    <span class="card-date font-mono">${note.pubDate}</span>
                </div>
                <h2 class="card-title">${note.title}</h2>
                <p class="card-desc">${note.description || 'No details provided. Click below to read the official blog post.'}</p>
                <div class="card-actions">
                    <a href="${note.link}" target="_blank" class="read-more-link" onclick="event.stopPropagation()">
                        Read Post ↗
                    </a>
                    <div class="card-social-actions" onclick="event.stopPropagation()">
                        <button class="share-icon-btn copy-btn" title="Copy to Clipboard" onclick="copyToClipboard(event, '${note.guid}')">
                            <svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                        </button>
                        <button class="share-icon-btn twitter-btn" title="Share on X" onclick="shareX(event, '${note.guid}')">
                            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </button>
                        <button class="share-icon-btn telegram-btn" title="Share on Telegram" onclick="shareTelegram(event, '${note.guid}')">
                            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.36-.49.99-.75 3.87-1.69 6.45-2.8 7.74-3.35 3.68-1.57 4.44-1.84 4.94-1.85.11 0 .36.03.52.16.14.11.18.27.19.39 0 .09.01.21-.01.32z"/></svg>
                        </button>
                        <button class="share-icon-btn whatsapp-btn" title="Share on WhatsApp" onclick="shareWhatsApp(event, '${note.guid}')">
                            <svg viewBox="0 0 24 24"><path d="M12.012 2c-5.506 0-9.988 4.482-9.988 9.988 0 1.76.458 3.477 1.329 5.004L2 22l5.148-1.352c1.472.803 3.123 1.224 4.852 1.226h.004c5.505 0 9.988-4.482 9.988-9.988 0-2.668-1.038-5.176-2.927-7.065A9.923 9.923 0 0 0 12.012 2zm5.772 13.518c-.317.892-1.815 1.637-2.49 1.71-.62.067-1.41.096-2.277-.18a10.96 10.96 0 0 1-4.733-2.94 10.153 10.153 0 0 1-2.694-4.22c-.372-1.127-.02-1.954.269-2.316.208-.262.484-.455.706-.455.223 0 .445.002.639.01.214.009.431-.077.58.283.188.455.642 1.564.698 1.677.056.113.093.245.018.395-.075.15-.113.245-.226.377-.113.132-.239.294-.34.396-.113.113-.231.236-.1.462.132.226.586.966 1.26 1.566.868.773 1.597 1.013 1.823 1.127.226.113.358.095.49-.057.132-.15.566-.66.717-.887.15-.226.302-.188.509-.113.208.075 1.32.623 1.547.736.226.113.377.17.434.264.057.094.057.546-.26 1.438z"/></svg>
                        </button>
                        <button class="share-icon-btn linkedin-btn" title="Share on LinkedIn" onclick="shareLinkedIn(event, '${note.guid}')">
                            <svg viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Resolve click selection conflict: click checklist indicator to select, card focus is key-based
        const checkbox = card.querySelector('.selection-overlay');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSelection(note.guid);
        });
        
        // Support Space/Enter keyboard clicks on the card
        card.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                toggleSelection(note.guid);
            }
        });
        
        notesGrid.appendChild(card);
    });
}

// Toggle card selection
function toggleSelection(guid) {
    const card = document.querySelector(`.note-card[data-guid="${guid}"]`);
    if (selectedGuids.has(guid)) {
        selectedGuids.delete(guid);
        if (card) {
            card.classList.remove('selected');
            card.setAttribute('aria-pressed', 'false');
        }
    } else {
        selectedGuids.add(guid);
        if (card) {
            card.classList.add('selected');
            card.setAttribute('aria-pressed', 'true');
        }
    }
    
    updateDrawer();
}

// Clear all selected cards
function clearSelection() {
    selectedGuids.clear();
    document.querySelectorAll('.note-card.selected').forEach(card => {
        card.classList.remove('selected');
        card.setAttribute('aria-pressed', 'false');
    });
    updateDrawer();
}

// Update bottom drawer UI and state
function updateDrawer() {
    const count = selectedGuids.size;
    selectionCountBadge.textContent = count;
    
    if (count > 0) {
        tweetDrawer.classList.add('active');
        generateTweetText();
    } else {
        tweetDrawer.classList.remove('active');
    }
}

// Generate pre-composed tweet based on selected cards
function generateTweetText() {
    const selectedNotes = releaseNotes.filter(note => selectedGuids.has(note.guid));
    let text = '';
    
    if (selectedNotes.length === 1) {
        const note = selectedNotes[0];
        text = `📢 AMD Gaming Update: "${note.title}"\n\n💡 ${note.description.substring(0, 120)}${note.description.length > 120 ? '...' : ''}\n\n🔗 ${note.link} via @GPUOpen #Radeon`;
    } else {
        text = `📢 Latest AMD Gaming & Graphics updates:\n\n`;
        selectedNotes.forEach(note => {
            text += `• ${note.title}\n`;
        });
        text += `\n🔗 Read details at https://gpuopen.com/news/ #AMDRadeon`;
    }
    
    tweetTextarea.value = text;
    handleTweetInput(); // Update counts
}

// Copy note content to clipboard
function copyToClipboard(event, guid) {
    event.stopPropagation();
    const note = releaseNotes.find(n => n.guid === guid);
    if (!note) return;
    const text = `📢 AMD Gaming Tech: "${note.title}"\n\n💡 ${note.description || ''}\n\n🔗 ${note.link}`;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Note copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy to clipboard.', true);
    });
}

// Share on X (Twitter)
function shareX(event, guid) {
    event.stopPropagation();
    const note = releaseNotes.find(n => n.guid === guid);
    if (!note) return;
    const text = `📢 AMD Gaming Tech: "${note.title}"\n\n🔗 ${note.link} via @GPUOpen #Radeon`;
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(xUrl, '_blank');
}

// Share on Telegram
function shareTelegram(event, guid) {
    event.stopPropagation();
    const note = releaseNotes.find(n => n.guid === guid);
    if (!note) return;
    const text = `📢 AMD Gaming Tech: "${note.title}"`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(note.link)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
}

// Share on WhatsApp
function shareWhatsApp(event, guid) {
    event.stopPropagation();
    const note = releaseNotes.find(n => n.guid === guid);
    if (!note) return;
    const text = `📢 AMD Gaming Tech: "${note.title}"\n\n🔗 ${note.link}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
}

// Share on LinkedIn
function shareLinkedIn(event, guid) {
    event.stopPropagation();
    const note = releaseNotes.find(n => n.guid === guid);
    if (!note) return;
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(note.link)}`;
    window.open(linkedinUrl, '_blank');
}

// Dynamic filtering logic
function handleSearchInput(e) {
    searchQuery = e.target.value;
    applyFilters();
}

function renderCategoryFilters(notes) {
    if (!notes || notes.length === 0) return;
    
    // Extract unique categories
    const allCategories = new Set();
    notes.forEach(note => {
        if (note.categories) {
            note.categories.forEach(cat => {
                if (cat.trim()) allCategories.add(cat.trim());
            });
        }
    });
    
    filterCategoriesContainer.innerHTML = '';
    
    // Render "All Tech" button
    const allBtn = document.createElement('button');
    allBtn.className = `filter-btn ${activeCategory === 'all' ? 'active' : ''}`;
    allBtn.textContent = 'All Tech';
    allBtn.dataset.category = 'all';
    allBtn.addEventListener('click', () => selectCategory('all'));
    filterCategoriesContainer.appendChild(allBtn);
    
    // Render unique category buttons (up to top 5)
    const topCategories = Array.from(allCategories).slice(0, 5);
    topCategories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`;
        btn.textContent = cat.replace(/-/g, ' ');
        btn.dataset.category = cat;
        btn.addEventListener('click', () => selectCategory(cat));
        filterCategoriesContainer.appendChild(btn);
    });
}

function selectCategory(category) {
    activeCategory = category;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.category.toLowerCase() === category.toLowerCase()) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    applyFilters();
}

function applyFilters() {
    const query = searchQuery.toLowerCase();
    const filtered = releaseNotes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(query) || 
                              (note.description && note.description.toLowerCase().includes(query));
        const matchesCategory = activeCategory === 'all' || 
                                (note.categories && note.categories.some(cat => cat.toLowerCase() === activeCategory.toLowerCase()));
        return matchesSearch && matchesCategory;
    });
    renderNotes(filtered);
    itemCountText.textContent = filtered.length;
}

// Auto-Optimize tweet text to fit exactly inside X/Twitter's 280 character limit
function optimizeTweetText() {
    const selectedNotes = releaseNotes.filter(note => selectedGuids.has(note.guid));
    if (selectedNotes.length === 0) {
        showToast('Please select at least one release note first.', true);
        return;
    }
    
    let text = '';
    const suffix = `\n🔗 Read details at https://gpuopen.com/news/ #AMDRadeon`;
    
    if (selectedNotes.length === 1) {
        const note = selectedNotes[0];
        const baseLength = `📢 AMD Gaming Update: "${note.title}"\n\n💡 ...\n\n🔗 ${note.link} via @GPUOpen #Radeon`.length;
        const descLimit = Math.max(50, 280 - baseLength);
        
        let cleanDesc = note.description.replace(/<[^>]*>/g, '').trim();
        let shortDesc = cleanDesc.substring(0, descLimit);
        if (cleanDesc.length > descLimit) {
            shortDesc += '...';
        }
        text = `📢 AMD Gaming Update: "${note.title}"\n\n💡 ${shortDesc}\n\n🔗 ${note.link} via @GPUOpen #Radeon`;
    } else {
        let prefix = `📢 Latest AMD Gaming & Graphics updates:\n\n`;
        const maxMainLength = 280 - prefix.length - suffix.length;
        let mainContent = '';
        
        selectedNotes.forEach((note) => {
            const itemText = `• ${note.title}\n`;
            if ((mainContent + itemText).length <= maxMainLength) {
                mainContent += itemText;
            } else {
                if (!mainContent.includes('• & more updates...\n')) {
                    mainContent += `• & more updates...\n`;
                }
            }
        });
        text = `${prefix}${mainContent}${suffix}`;
    }
    
    tweetTextarea.value = text;
    handleTweetInput();
    showToast('Tweet optimized to fit 280 characters!');
}

// Bat storm refresh animation
function triggerBatStormAndRefresh(event) {
    if (event) event.stopPropagation();
    
    // UI Feedback: Syncing state
    refreshBtn.classList.add('spinning');
    refreshBtn.style.animation = 'continuous-spin 2s linear infinite';
    syncStatus.textContent = 'Refreshing...';
    statusDot.className = 'status-dot yellow';
    
    // Create bat storm container
    const stormContainer = document.createElement('div');
    stormContainer.style.position = 'fixed';
    stormContainer.style.top = '0';
    stormContainer.style.left = '0';
    stormContainer.style.width = '100vw';
    stormContainer.style.height = '100vh';
    stormContainer.style.pointerEvents = 'none';
    stormContainer.style.zIndex = '9999';
    stormContainer.style.overflow = 'hidden';
    document.body.appendChild(stormContainer);
    
    const batCount = 80;
    const batSvgPath = "M12,3.5 C11.2,4.8 9.5,6.5 7.5,6.5 C6,6.5 5.5,5.5 4,5.5 C2.5,5.5 1.5,7.5 2,9.5 C2.5,11.5 4,13 6.5,13.5 C8.5,14 11,13 12,11.5 C13,13 15.5,14 17.5,13.5 C20,13 21.5,11.5 22,9.5 C22.5,7.5 21.5,5.5 20,5.5 C18.5,5.5 18,6.5 16.5,6.5 C14.5,6.5 12.8,4.8 12,3.5 Z";
    
    for (let i = 0; i < batCount; i++) {
        const bat = document.createElement('div');
        bat.style.position = 'absolute';
        bat.style.width = `${15 + Math.random() * 45}px`;
        bat.style.height = `${15 + Math.random() * 45}px`;
        bat.style.left = `${Math.random() * 100}vw`;
        bat.style.top = `-${50 + Math.random() * 150}px`;
        bat.style.opacity = '0.85';
        bat.style.filter = 'drop-shadow(0 0 8px rgba(230,0,18,0.6))';
        bat.style.transform = `rotate(${Math.random() * 360}deg)`;
        
        // Falling animation using CSS keyframes
        bat.style.animation = `bat-fall ${1.0 + Math.random() * 1.5}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${Math.random() * 0.5}s forwards`;
        
        bat.innerHTML = `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="var(--amd-red)">
                <path d="${batSvgPath}" />
            </svg>
        `;
        stormContainer.appendChild(bat);
    }
    
    // Create blackout screen
    const blackout = document.createElement('div');
    blackout.style.position = 'fixed';
    blackout.style.inset = '0';
    blackout.style.background = '#000000';
    blackout.style.zIndex = '9998';
    blackout.style.opacity = '0';
    blackout.style.transition = 'opacity 1.5s ease-in-out';
    document.body.appendChild(blackout);
    
    // Force reflow
    blackout.getBoundingClientRect();
    blackout.style.opacity = '1';
    
    // Reload page after animations
    setTimeout(() => {
        window.location.reload();
    }, 2000);
}

// Handle text input, character counts and color coding
function handleTweetInput() {
    const text = tweetTextarea.value;
    const length = text.length;
    charUsed.textContent = length;
    
    // Classify danger zones
    if (length > 280) {
        charCounter.className = 'char-counter danger';
        tweetBtn.disabled = true;
    } else if (length > 250) {
        charCounter.className = 'char-counter warning';
        tweetBtn.disabled = false;
    } else {
        charCounter.className = 'char-counter';
        tweetBtn.disabled = false;
    }
}

// Fire the tweet web intent
function publishTweet() {
    const text = tweetTextarea.value;
    if (text.length > 280) {
        showToast('Tweet exceeds X/Twitter character limit (280)!', true);
        return;
    }
    
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(xUrl, '_blank');
}

// Inject continuous spinning keyframe
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes continuous-spin {
    0% { transform: rotate(0deg) scale(1.15); }
    100% { transform: rotate(360deg) scale(1.15); }
}

.error-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    background: rgba(230, 0, 18, 0.05);
    border: 1px solid rgba(230, 0, 18, 0.2);
    border-radius: 16px;
    backdrop-filter: blur(10px);
}

.retry-btn {
    margin-top: 15px;
    background: var(--amd-red);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 700;
    transition: var(--transition-smooth);
}

.retry-btn:hover {
    box-shadow: 0 0 15px var(--amd-red-glow);
    transform: scale(1.05);
}

.empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
}
`;
document.head.appendChild(styleSheet);
