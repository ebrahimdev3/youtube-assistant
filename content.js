const YT_ASSISTANT = {
    watchedSet: new Set(),
    debounceTimer: null,

    async init() {
        await this.loadStorage();
        this.setupObserver();
        this.handleUrlChanges();
        this.processPage();
    },

    async loadStorage() {
        const res = await chrome.storage.local.get(['watchedVideos']);
        if (res.watchedVideos) {
            this.watchedSet = new Set(res.watchedVideos);
        }
    },

    saveVideo(id) {
        if (id && !this.watchedSet.has(id)) {
            this.watchedSet.add(id);
            chrome.storage.local.set({ watchedVideos: Array.from(this.watchedSet) });
        }
    },

    getVideoId(url) {
        try {
            const urlObj = new URL(url);
            return new URLSearchParams(urlObj.search).get('v');
        } catch (e) { return null; }
    },

    formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num;
    },

    async updateDislikes(videoId) {
        const dislikeBtn = document.querySelector('dislike-button-view-model');
        if (!dislikeBtn) return;

        try {
            const response = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`);
            const data = await response.json();
            const textNode = dislikeBtn.querySelector('.yt-spec-button-shape-next__button-text-content');
            if (textNode) textNode.innerText = this.formatNumber(data.dislikes);
        } catch (err) { console.error("API Error:", err); }
    },

    processPage() {
        document.querySelectorAll('ytd-thumbnail:not(.processed)').forEach(thumb => {
            const link = thumb.querySelector('a#thumbnail')?.href;
            if (link) {
                const id = this.getVideoId(link);
                if (this.watchedSet.has(id)) {
                    thumb.classList.add('watched-video');
                }
                thumb.classList.add('processed');
            }
        });

        const currentId = this.getVideoId(window.location.href);
        if (currentId) {
            this.updateDislikes(currentId);
            this.saveVideo(currentId);
        }
    },

    debounceProcess() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.processPage();
        }, 500);
    },

    setupObserver() {
        const targetNode = document.querySelector('ytd-app') || document.body;
        const observer = new MutationObserver(() => this.debounceProcess());
        observer.observe(targetNode, { childList: true, subtree: true });
    },

    handleUrlChanges() {
        window.addEventListener('yt-navigate-finish', () => {
            this.debounceProcess();
        });
    }
};

YT_ASSISTANT.init();
