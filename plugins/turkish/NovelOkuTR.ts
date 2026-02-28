import { fetchHtml } from "@libs/fetch";
import { Plugin } from "@tmrace/lnreader-plugin-utils";
import { NovelItem, NovelDetails, ChapterItem } from "@tmrace/lnreader-plugin-utils";
import { load as parseHTML } from "cheerio";

class NovelOkuTR implements Plugin.PluginBase {
    id = "novelokutr";
    name = "Novel Oku TR";
    icon = "src/turkish/novelokutr/icon.png";
    site = "https://novelokutr.net/";
    version = "1.0.0";

    // Popüler romanları listelem
    async popularNovels(pageNo: number): Promise<NovelItem[]> {
        const url = `${this.site}seri-listesi/page/${pageNo}/?m_orderby=views`;
        const body = await fetchHtml({ url });
        const loadedCheerio = parseHTML(body);

        const novels: NovelItem[] = [];

        // Site yapısına göre seçicileri güncelledi
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
    async getNovelDetails(novelPath: string): Promise<NovelDetails> {
        const url = `${this.site}${novelPath}`;
        const body = await fetchHtml({ url });
        const loadedCheerio = parseHTML(body);

        const novel: NovelDetails = {
            path: novelPath,
            name: loadedCheerio(".post-title h1").text().trim(),
            cover: loadedCheerio(".summary_image img").attr("src"),
            author: loadedCheerio(".author-content a").text().trim(),
            description: loadedCheerio(".description-summary .summary__content").text().trim(),
            genres: "",
            status: loadedCheerio(".post-status .summary-content").text().trim(),
            chapters: [],
        };

        const chapters: ChapterItem[] = [];

        // Bölüm listesini çekme (Ajax veya direkt HTML)
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

        novel.chapters = chapters.reverse(); // Eskiden yeniye sıralama
        return novel;
    }

    // Bölüm içeriğini çekme
    async getChapterPages(chapterPath: string): Promise<string> {
        const url = `${this.site}${chapterPath}`;
        const body = await fetchHtml({ url });
        const loadedCheerio = parseHTML(body);

        // Genellikle metin 'text-left' veya 'reading-content' sınıflarında bulunur
        let chapterText = loadedCheerio(".reading-content").html() || "";
        
        // Gereksiz script ve reklam etiketlerini temizleme
        chapterText = chapterText.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "");

        return chapterText;
    }

    // Arama fonksiyonu
    async searchNovels(searchTerm: string, pageNo: number): Promise<NovelItem[]> {
        const url = `${this.site}page/${pageNo}/?s=${searchTerm}&post_type=wp-manga`;
        const body = await fetchHtml({ url });
        const loadedCheerio = parseHTML(body);

        const novels: NovelItem[] = [];

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
