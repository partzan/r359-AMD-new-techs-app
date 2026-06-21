// State Management
let releaseNotes = [];
const selectedGuids = new Set();

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchNotes(false);
    
    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchNotes(true));
    clearSelectionBtn.addEventListener('click', clearSelection);
    tweetBtn.addEventListener('click', publishTweet);
    
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
            renderNotes(releaseNotes);
            itemCountText.textContent = releaseNotes.length;
            
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
        notesGrid.innerHTML = '<div class="empty-state">No release notes found.</div>';
        return;
    }

    notesGrid.innerHTML = '';
    
    notes.forEach((note, index) => {
        const isSelected = selectedGuids.has(note.guid);
        const card = document.createElement('div');
        card.className = `note-card ${isSelected ? 'selected' : ''}`;
        card.dataset.guid = note.guid;
        card.dataset.index = index;
        
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
                <div class="selection-overlay"></div>
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
                    <button class="card-tweet-btn font-mono" onclick="quickTweet(event, ${index})">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        Tweet This
                    </button>
                </div>
            </div>
        `;
        
        // Card click handler (toggle selection)
        card.addEventListener('click', () => toggleSelection(note.guid));
        notesGrid.appendChild(card);
    });
}

// Toggle card selection
function toggleSelection(guid) {
    if (selectedGuids.has(guid)) {
        selectedGuids.delete(guid);
        const card = document.querySelector(`.note-card[data-guid="${guid}"]`);
        if (card) card.classList.remove('selected');
    } else {
        selectedGuids.add(guid);
        const card = document.querySelector(`.note-card[data-guid="${guid}"]`);
        if (card) card.classList.add('selected');
    }
    
    updateDrawer();
}

// Clear all selected cards
function clearSelection() {
    selectedGuids.clear();
    document.querySelectorAll('.note-card.selected').forEach(card => {
        card.classList.remove('selected');
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

// Handle quick tweet directly from card
function quickTweet(event, index) {
    event.stopPropagation(); // Avoid selecting card
    const note = releaseNotes[index];
    const text = `📢 AMD Gaming Tech: "${note.title}"\n\n💡 ${note.description.substring(0, 130)}...\n\n🔗 ${note.link} via @GPUOpen #Radeon #GamingTech`;
    
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(xUrl, '_blank');
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
