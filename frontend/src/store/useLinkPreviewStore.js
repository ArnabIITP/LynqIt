import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// url -> previewData
export const useLinkPreviewStore = create(persist(
	(set, get) => ({
		cache: {},
		getPreview: (url) => get().cache[url],
			setPreview: (url, data) => {
				// Only cache successful previews (not errors)
				if (data && !data.error) {
					set(state => ({
						cache: { ...state.cache, [url]: data }
					}));
				}
			},
		clearPreviews: () => set({ cache: {} })
	}),
	{
		name: 'link-preview-cache', // localStorage key
	}
));
