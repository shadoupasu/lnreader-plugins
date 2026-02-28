import { load as parseHTML } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { Plugin } from '@/types/plugin';

class NovelOkuTR implements Plugin.PluginBase {
    id = 'novelokutr';
    name = 'Novel Oku TR';
    icon = 'src/turkish/novelokutr/icon.png';
    site = 'https://novelokutr.net/';
    version = '1.0.7';

    // 1. ÇÖZÜM: Popüler Romanları çalışan arama altyapısı ile çekiyoruz
    async popularNovels(pageNo: number): Promise<Plugin.NovelItem[]> {
        // Arama sayfasını parametresiz ve "görüntülenmeye göre sırala" (m_orderby=views) mantığıyla kullanıyoruz
        const url = `${this.site}page/${pageNo}/?s=&post_type=wp-manga&m_orderby=views`;
        
        const result = await fetchApi(url);
        const body = await result.text();
        const loadedCheerio = parseHTML(body);

        const novels: Plugin.NovelItem[] = [];

        loadedCheerio(".c-tabs-item__content").each((i, el) => {
            const novelName = loadedCheerio(el).find(".post-title h3 a").text().trim();
            // Resimler bazen tembel yükleme (lazy load) yüzünden data-src içinde gizlenir
            const novelCover = loadedCheerio(el).find("img").attr("data-src") || loadedCheerio(el).find("img").attr("src");
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

    // 2. ÇÖZÜM: Roman Detayları ve AJAX Bölüm Çekme
    async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
        const url = `${this.site}${novelPath}`;
        
        const result = await fetchApi(url);
        const body = await result.text();
        const loadedCheerio = parseHTML(body);

        const novel: Plugin.SourceNovel = {
            path: novelPath,
            name: loadedCheerio(".post-title h1").text().trim(),
            cover: loadedCheerio(".summary_image img").attr("data-src") || loadedCheerio(".summary_image img").attr("src"),
            author: loadedCheerio(".author-content a").text().trim(),
            summary: loadedCheerio(".description-summary .summary__content").text().trim(),
            status: loadedCheerio(".post-status .summary-content").text().trim(),
            chapters: [],
        };

        // Madara temasında bölümleri çekmek için romanın gizli ID'sini bulmamız gerek
        const novelId = loadedCheerio('.rating-post-id').attr('value');
        let chapterHtml = body; // Varsayılan olarak sayfa içeriği

        // Eğer ID bulursak, siteye bölümleri vermesi için POST isteği atıyoruz
        if (novelId) {
            const chapterReq = await fetchApi(`${this.site}wp-admin/admin-ajax.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `action=manga_get_chapters&manga=${novelId}`
            });
            chapterHtml = await chapterReq.text();
        }

        const chapterCheerio = parseHTML(chapterHtml);
        const chapters: Plugin.ChapterItem[] = [];

        chapterCheerio(".wp-manga-chapter").each((i, el) => {
            const chapterName = chapterCheerio(el).find("a").text().trim();
            const chapterUrl = chapterCheerio(el).find("a").attr("href");
            const releaseDate = chapterCheerio(el).find(".chapter-release-date").text().trim();

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
    async parseChapter(chapterPath: string): Promise<string> {
        const url = `${this.site}${chapterPath}`;
        
        const result = await fetchApi(url);
        const body = await result.text();
        const loadedCheerio = parseHTML(body);

        let chapterText = loadedCheerio(".reading-content").html() || "";
        
        chapterText = chapterText.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "");

        return chapterText;
    }

    // Arama fonksiyonu (Kapak resmi iyileştirildi)
    async searchNovels(searchTerm: string, pageNo: number): Promise<Plugin.NovelItem[]> {
        const url = `${this.site}page/${pageNo}/?s=${searchTerm}&post_type=wp-manga`;
        
        const result = await fetchApi(url);
        const body = await result.text();
        const loadedCheerio = parseHTML(body);

        const novels: Plugin.NovelItem[] = [];

        loadedCheerio(".c-tabs-item__content").each((i, el) => {
            const novelName = loadedCheerio(el).find(".post-title h3 a").text().trim();
            const novelCover = loadedCheerio(el).find("img").attr("data-src") || loadedCheerio(el).find("img").attr("src");
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
