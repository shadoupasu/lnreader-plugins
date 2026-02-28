import { CheerioAPI, load as parseHTML } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { Plugin } from '@/types/plugin';

class NovelOkuTR implements Plugin.PluginBase {
    id = 'novelokutr';
    name = 'Novel Oku TR';
    icon = 'src/turkish/novelokutr/icon.png';
    site = 'https://novelokutr.net/';
    version = '1.0.5';

    // Popüler romanları listeleme
    async popularNovels(pageNo: number): Promise<Plugin.NovelItem[]> {
        try {
            if (pageNo < 1) {
                console.warn('Invalid page number. Using page 1.');
                pageNo = 1;
            }

            const url = `${this.site}seri-listesi/page/${pageNo}/?m_orderby=views`;
            const body = await fetchApi(url).then(r => r.text());

            if (!body) {
                console.error('Failed to fetch HTML content');
                return [];
            }

            const loadedCheerio = parseHTML(body);
            const novels: Plugin.NovelItem[] = [];

            loadedCheerio('.page-item-detail').each((i, el) => {
                try {
                    const novelName = loadedCheerio(el).find('.post-title h3 a').text().trim();
                    const novelCover = loadedCheerio(el).find('img').attr('src');
                    const novelUrl = loadedCheerio(el).find('.post-title h3 a').attr('href');

                    if (novelUrl && novelName) {
                        novels.push({
                            name: novelName,
                            cover: novelCover || '',
                            path: novelUrl.replace(this.site, ''),
                        });
                    }
                } catch (error) {
                    console.warn('Error parsing novel item:', error);
                }
            });

            return novels;
        } catch (error) {
            console.error('Error in popularNovels:', error);
            return [];
        }
    }

    // Roman detaylarını ve bölüm listesini çekme
    async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
        try {
            if (!novelPath) {
                throw new Error('Novel path is required');
            }

            const url = `${this.site}${novelPath}`;
            const body = await fetchApi(url).then(r => r.text());

            if (!body) {
                throw new Error('Failed to fetch novel details');
            }

            const loadedCheerio = parseHTML(body);

            const novel: Plugin.SourceNovel = {
                path: novelPath,
                name: loadedCheerio('.post-title h1').text().trim() || 'Unknown',
                cover: loadedCheerio('.summary_image img').attr('src') || '',
                author: loadedCheerio('.author-content a').text().trim() || 'Unknown',
                summary: loadedCheerio('.description-summary .summary__content').text().trim() || '',
                chapters: [],
            };

            const chapters: Plugin.ChapterItem[] = [];

            loadedCheerio('.wp-manga-chapter').each((i, el) => {
                try {
                    const chapterName = loadedCheerio(el).find('a').text().trim();
                    const chapterUrl = loadedCheerio(el).find('a').attr('href');
                    const releaseDate = loadedCheerio(el).find('.chapter-release-date').text().trim();

                    if (chapterUrl && chapterName) {
                        chapters.push({
                            name: chapterName,
                            path: chapterUrl.replace(this.site, ''),
                            releaseTime: releaseDate || '',
                        });
                    }
                } catch (error) {
                    console.warn('Error parsing chapter:', error);
                }
            });

            novel.chapters = chapters.reverse();
            return novel;
        } catch (error) {
            console.error('Error in parseNovel:', error);
            return {
                path: novelPath,
                name: 'Error loading novel',
                cover: '',
                author: '',
                summary: '',
                chapters: [],
            };
        }
    }

    // Bölüm içeriğini çekme
    async parseChapter(chapterPath: string): Promise<string> {
        try {
            if (!chapterPath) {
                throw new Error('Chapter path is required');
            }

            const url = `${this.site}${chapterPath}`;
            const body = await fetchApi(url).then(r => r.text());

            if (!body) {
                throw new Error('Failed to fetch chapter content');
            }

            const loadedCheerio = parseHTML(body);

            let chapterText = loadedCheerio('.reading-content').html() || '';

            if (!chapterText) {
                console.warn('No chapter content found with .reading-content selector');
                return '';
            }

            // Gereksiz script ve reklam etiketlerini temizleme
            chapterText = chapterText.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '');
            chapterText = chapterText.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, '');
            chapterText = chapterText.replace(/<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gmi, '');

            return chapterText;
        } catch (error) {
            console.error('Error in parseChapter:', error);
            return '';
        }
    }

    // Arama fonksiyonu
    async searchNovels(searchTerm: string, pageNo: number): Promise<Plugin.NovelItem[]> {
        try {
            if (!searchTerm || searchTerm.trim().length === 0) {
                console.warn('Search term is empty');
                return [];
            }

            if (pageNo < 1) {
                pageNo = 1;
            }

            const encodedSearchTerm = encodeURIComponent(searchTerm);
            const url = `${this.site}page/${pageNo}/?s=${encodedSearchTerm}&post_type=wp-manga`;
            const body = await fetchApi(url).then(r => r.text());

            if (!body) {
                console.error('Failed to fetch search results');
                return [];
            }

            const loadedCheerio = parseHTML(body);
            const novels: Plugin.NovelItem[] = [];

            loadedCheerio('.c-tabs-item__content').each((i, el) => {
                try {
                    const novelName = loadedCheerio(el).find('.post-title h3 a').text().trim();
                    const novelCover = loadedCheerio(el).find('img').attr('src');
                    const novelUrl = loadedCheerio(el).find('.post-title h3 a').attr('href');

                    if (novelUrl && novelName) {
                        novels.push({
                            name: novelName,
                            cover: novelCover || '',
                            path: novelUrl.replace(this.site, ''),
                        });
                    }
                } catch (error) {
                    console.warn('Error parsing search result:', error);
                }
            });

            return novels;
        } catch (error) {
            console.error('Error in searchNovels:', error);
            return [];
        }
    }

    // Helper method to extract genres
    private extractGenres(cheerio: CheerioAPI): string {
        try {
            const genres: string[] = [];
            cheerio('.genres-content a, .genre a').each((i: number, el: any) => {
                const genreText = cheerio(el).text().trim();
                if (genreText) {
                    genres.push(genreText);
                }
            });
            return genres.join(', ')

