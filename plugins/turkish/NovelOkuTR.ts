import { load as parseHTML } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { Plugin } from '@/types/plugin';

class NovelOkuTR implements Plugin.PluginBase {
    id = 'novelokutr';
    name = 'Novel Oku TR';
    icon = 'src/turkish/novelokutr/icon.png';
    site = 'https://novelokutr.net/';
    version = '1.0.6'; // Güncelleme algılansın diye versiyon artırıldı

    // Popüler romanları listeleme
    async popularNovels(pageNo: number): Promise<Plugin.NovelItem[]> {
        const url = `${this.site}seri-listesi/page/${pageNo}/?m_orderby=views`;
        
        const result = await fetchApi(url);
        const body = await result.text();
        const loadedCheerio = parseHTML(body);

        const novels: Plugin.NovelItem[] = [];

        loadedCheerio(".page-item-detail").each((i, el) => {
            const novelName = loadedCheerio(el).find(".post-title h3 a").text().trim();
            const novelCover = loadedCheerio(el).find("img").attr("src");
            const novelUrl = loadedCheerio(el).find(".post-title h3 a").attr("href");

            if (novelUrl) {
                novels.push({
                    name: novelName,
                    cover: novelCover,
                    path: novelUrl.replace(this.site, ""),
                });
            }
        });

        return novels;
    }

    // Roman detaylarını ve bölüm listesini çekme
    async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
        const url = `${this.site}${novelPath}`;
        
        const result = await fetchApi(url);
        const body = await result.text();
        const loadedCheerio = parseHTML(body);

        const novel: Plugin.SourceNovel = {
            path: novelPath,
            name: loadedCheerio(".post-title h1").text().trim(),
            cover: loadedCheerio(".summary_image img").attr("src"),
            author: loadedCheerio(".author-content a").text().trim(),
            summary: loadedCheerio(".description-summary .summary__content").text().trim(),
            status: loadedCheerio(".post-status .summary-content").text().trim(),
            chapters: [],
        };

        const chapters: Plugin.ChapterItem[] = [];

        // 1. Deneme: HTML içinde bölüm var mı kontrol et
        loadedCheerio(".wp-manga-chapter").each((i, el) => {
            const chapterName = loadedCheerio(el).find("a").text().trim();
            const chapterUrl = loadedCheerio(el).find("a").attr("href");
            const releaseDate = loadedCheerio(el).find(".chapter-release-date").text().trim();

            if (chapterUrl) {
                chapters.push({
                    name: chapterName,
                    path: chapterUrl.replace(this.site, ""),
                    releaseTime: releaseDate,
                });
            }
        });

        // 2. Deneme (Madara AJAX Yöntemi): Eğer bölüm bulunamadıysa AJAX isteği at
        if (chapters.length === 0) {
            const ajaxUrl = url.endsWith('/') ? `${url}ajax/chapters/` : `${url}/ajax/chapters/`;
            
            try {
                // Madara teması bölümleri POST isteği ile verir
                const ajaxResult = await fetchApi(ajaxUrl, { method: 'POST' });
                const ajaxBody = await ajaxResult.text();
                const ajaxCheerio = parseHTML(ajaxBody);

                ajaxCheerio(".wp-manga-chapter").each((i, el) => {
                    const chapterName = ajaxCheerio(el).find("a").text().trim();
                    const chapterUrl = ajaxCheerio(el).find("a").attr("href");
                    const releaseDate = ajaxCheerio(el).find(".chapter-release-date i").text().trim();

                    if (chapterUrl) {
                        chapters.push({
                            name: chapterName,
                            path: chapterUrl.replace(this.site, ""),
                            releaseTime: releaseDate,
                        });
                    }
                });
            } catch (error) {
                console.error("Bölümler AJAX ile çekilemedi:", error);
            }
        }

        novel.chapters = chapters.reverse(); // Bölümleri eskiden yeniye sırala (Uygulama standardı)
        return novel;
    }

    // Bölüm içeriğini çekme
    async parseChapter(chapterPath: string): Promise<string> {
        const url = `${this.site}${chapterPath}`;
        
        const result = await fetchApi(url);
        const body = await result.text();
        const loadedCheerio = parseHTML(body);

        let chapterText = loadedCheerio(".reading-content").html() || "";
        
        // Gereksiz script ve reklam etiketlerini temizleme
        chapterText = chapterText.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "");

        return chapterText;
    }

    // Arama fonksiyonu
    async searchNovels(searchTerm: string, pageNo: number): Promise<Plugin.NovelItem[]> {
        const url = `${this.site}page/${pageNo}/?s=${searchTerm}&post_type=wp-manga`;
        
        const result = await fetchApi(url);
        const body = await result.text();
        const loadedCheerio = parseHTML(body);

        const novels: Plugin.NovelItem[] = [];

        loadedCheerio(".c-tabs-item__content").each((i, el) => {
            const novelName = loadedCheerio(el).find(".post-title h3 a").text().trim();
            const novelCover = loadedCheerio(el).find("img").attr("src");
            const novelUrl = loadedCheerio(el).find(".post-title h3 a").attr("href");

            if (novelUrl) {
                novels.push({
                    name: novelName,
                    cover: novelCover,
                    path: novelUrl.replace(this.site, ""),
                });
            }
        });

        return novels;
    }
}

export default new NovelOkuTR();
