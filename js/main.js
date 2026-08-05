        // ============================================================
        // 1. 路径适配
        // ============================================================
        function getBasePath() {
            var path = window.location.pathname;
            if (path.endsWith('.html')) {
                return path.substring(0, path.lastIndexOf('/'));
            }
            return path.replace(/\/$/, '');
        }
        var BASE_PATH = getBasePath();

        function getImageUrl(url) {
            if (!url) return '';
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            if (url.startsWith('/')) return BASE_PATH + url;
            return url;
        }

        function getThumbnailUrl(url) {
            if (!url) return '';
            if (url.indexOf('th?id=') !== -1) {
                var baseUrl = url.split('&')[0];
                var thumbUrl = baseUrl.replace('_UHD.jpg', '_400x240.jpg');
                return thumbUrl;
            }
            return url;
        }

        // ============================================================
        // 2. 主题切换
        // ============================================================
        var themeToggle = document.getElementById('themeToggle');
        var currentTheme = localStorage.getItem('theme') || 'dark';

        function setTheme(theme) {
            currentTheme = theme;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        }
        themeToggle.addEventListener('click', function() {
            setTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });
        setTheme(currentTheme);

        // ============================================================
        // 3. 进度条
        // ============================================================
        var progressBar = document.getElementById('progress-bar');

        function showProgress() {
            progressBar.style.width = '30%';
            setTimeout(function() { progressBar.style.width = '60%'; }, 150);
        }

        function hideProgress() {
            progressBar.style.width = '100%';
            setTimeout(function() { progressBar.style.width = '0%'; }, 350);
        }

        // ============================================================
        // 4. 导航栏
        // ============================================================
        var navToggle = document.getElementById('navToggle');
        var navbar = document.getElementById('navbar');
        var navOpen = false;

        function toggleNav(open) {
            navOpen = open !== undefined ? open : !navOpen;
            navbar.classList.toggle('open', navOpen);
            navToggle.innerHTML = navOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        }

        navToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleNav();
        });
        document.addEventListener('click', function(e) {
            if (navOpen && !navbar.contains(e.target) && e.target !== navToggle) {
                toggleNav(false);
            }
        });

        // ============================================================
        // 5. 评论系统 - Twikoo
        // ============================================================
        var commentOverlay = document.getElementById('commentOverlay');
        var closeCommentBtn = document.getElementById('closeCommentBtn');
        var commentNavBtn = document.getElementById('commentNavBtn');

        function openComment() {
            commentOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            toggleNav(false);
            if (!document.getElementById('tcomment').hasChildNodes()) {
                initTwikoo();
            }
        }

        function closeComment() {
            commentOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        function initTwikoo() {
            if (typeof twikoo === 'undefined') {
                setTimeout(initTwikoo, 500);
                return;
            }
            twikoo.init({
                envId: 'https://twikoo.hangdn.net',
                el: '#tcomment',
                lang: 'zh-CN',
            });
        }

        commentNavBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openComment();
        });

        closeCommentBtn.addEventListener('click', closeComment);

        commentOverlay.addEventListener('click', function(e) {
            if (e.target === commentOverlay) {
                closeComment();
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && commentOverlay.classList.contains('active')) {
                closeComment();
            }
        });

        // ============================================================
        // 6. 数据加载 - ★★★ 无限滚动（修复叠加）★★★
        // ============================================================
        var allData = [];
        var filteredData = [];
        var currentPage = 1;
        var PAGE_SIZE = 30;
        var totalPages = 1;
        var isLoading = false;
        var hasMore = true;
        var currentPreviewIndex = 0;
        var currentPreviewItem = null;
        var scrollTimer = null;  // ★★★ 防抖定时器 ★★★

        var grid = document.getElementById('grid');
        var previewOverlay = document.getElementById('previewOverlay');
        var previewImg = document.getElementById('previewImg');
        var previewCopyright = document.getElementById('previewCopyright');
        var previewDate = document.getElementById('previewDate');
        var previewDesc = document.getElementById('previewDesc');
        var totalNavCount = document.getElementById('totalNavCount');
        var searchInput = document.getElementById('searchInput');
        var searchBtn = document.getElementById('searchBtn');
        var homeBtn = document.getElementById('homeBtn');
        var closePreviewBtn = document.getElementById('closePreviewBtn');
        var donateBtn = document.getElementById('donateBtn');
        var donateModal = document.getElementById('donateModal');
        var closeDonate = document.getElementById('closeDonate');
        var downloadBtn = document.getElementById('downloadBtn');
        var downloadMenu = document.getElementById('downloadMenu');
        var backToTop = document.getElementById('backToTop');

        // 缩放状态
        var scale = 1,
            minScale = 0.3,
            maxScale = 5,
            translateX = 0,
            translateY = 0,
            isDragging = false,
            startX = 0,
            startY = 0,
            lastTranslateX = 0,
            lastTranslateY = 0;

        // 工具栏显示状态
        var toolbarVisible = true;

        // ============================================================
        // 6.1 加载数据
        // ============================================================
        async function loadData() {
            showProgress();
            try {
                var url = BASE_PATH + '/data/wallpapers.json';
                var res = await fetch(url);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                allData = await res.json();
                if (!Array.isArray(allData) || allData.length === 0) {
                    showEmpty();
                    hideProgress();
                    return;
                }
                allData.sort(function(a, b) { return b.date.localeCompare(a.date); });
                filteredData = [];
                totalNavCount.textContent = allData.length;
                totalPages = Math.ceil(allData.length / PAGE_SIZE);
                currentPage = 1;
                hasMore = true;
                grid.innerHTML = '';
                renderPage(1);
                hideProgress();
            } catch (err) {
                console.error('加载失败:', err);
                showEmpty();
                hideProgress();
            }
        }

        // ============================================================
        // 6.2 渲染页面 - ★★★ 追加模式 ★★★
        // ============================================================
        function renderPage(page) {
            var data = filteredData.length > 0 ? filteredData : allData;
            totalPages = Math.ceil(data.length / PAGE_SIZE);
            if (page < 1) page = 1;
            if (page > totalPages) {
                hasMore = false;
                showNoMore();
                return;
            }
            currentPage = page;
            var start = (page - 1) * PAGE_SIZE;
            var end = Math.min(start + PAGE_SIZE, data.length);
            var items = data.slice(start, end);
            
            if (items.length === 0) {
                hasMore = false;
                showNoMore();
                return;
            }

            // 移除加载状态
            var loadingEl = document.querySelector('.loading-indicator');
            if (loadingEl) loadingEl.remove();

            items.forEach(function(item) {
                var card = document.createElement('div');
                card.className = 'card';

                var thumbSrc = getImageUrl(item.thumb || item.webp || item.jpg || '');
                var fullImgSrc = getImageUrl(item.webp || item.jpg || '');
                var fallback = getImageUrl(item.jpg || '');
                var placeholderSrc = getThumbnailUrl(thumbSrc);

                card.innerHTML =
                    '<div class="placeholder-bg" style="background-image: url(' + placeholderSrc + ');"></div>' +
                    '<img src="' + thumbSrc + '" alt="' + (item.copyright || item.date) + '" loading="lazy" />' +
                    '<div class="info">' +
                    '<div class="date">' + item.date + '</div>' +
                    '<div class="title">' + (item.copyright || '无标题') + '</div>' +
                    '<div class="copyright">' + (item.copyright || '') + '</div>' +
                    '</div>';

                var img = card.querySelector('img');
                var placeholderBg = card.querySelector('.placeholder-bg');

                img.addEventListener('load', function() {
                    img.classList.add('loaded');
                    placeholderBg.classList.add('hidden');
                });
                if (img.complete) {
                    img.classList.add('loaded');
                    placeholderBg.classList.add('hidden');
                }
                img.addEventListener('error', function() {
                    if (fullImgSrc && fullImgSrc !== thumbSrc) {
                        this.src = fullImgSrc;
                    } else if (fallback && fallback !== thumbSrc) {
                        this.src = fallback;
                    } else {
                        this.classList.add('loaded');
                        placeholderBg.classList.add('hidden');
                    }
                });

                card.addEventListener('click', function() {
                    var targetIndex = -1;
                    for (var i = 0; i < allData.length; i++) {
                        if (allData[i].date === item.date) {
                            targetIndex = i;
                            break;
                        }
                    }
                    if (targetIndex === -1) return;
                    openPreview(targetIndex);
                });

                grid.appendChild(card);
            });

            // 如果还有更多数据，添加加载指示器
            if (page < totalPages) {
                var loadingDiv = document.createElement('div');
                loadingDiv.className = 'loading-indicator';
                loadingDiv.id = 'loadingIndicator';
                loadingDiv.innerHTML = '<i class="fas fa-spinner"></i> 加载更多...';
                grid.appendChild(loadingDiv);
            } else {
                hasMore = false;
                showNoMore();
            }
            
            // ★★★ 解锁 ★★★
            isLoading = false;
        }

        // ============================================================
        // 6.3 加载更多（滚动触发）- ★★★ 加锁防止叠加 ★★★
        // ============================================================
        function loadMore() {
            if (isLoading || !hasMore) return;
            
            var data = filteredData.length > 0 ? filteredData : allData;
            var total = Math.ceil(data.length / PAGE_SIZE);
            if (currentPage >= total) {
                hasMore = false;
                showNoMore();
                return;
            }
            
            isLoading = true;
            var nextPage = currentPage + 1;
            
            var loadingEl = document.getElementById('loadingIndicator');
            if (loadingEl) {
                loadingEl.innerHTML = '<i class="fas fa-spinner"></i> 加载中...';
            }
            
            renderPage(nextPage);
            
            // ★★★ 安全解锁 ★★★
            setTimeout(function() {
                isLoading = false;
            }, 300);
        }

        // ============================================================
        // 6.4 滚动检测 - ★★★ 加防抖 ★★★
        // ============================================================
        function checkScroll() {
            if (grid.scrollTop > 500) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }

            if (scrollTimer) {
                clearTimeout(scrollTimer);
            }
            scrollTimer = setTimeout(function() {
                var scrollTop = grid.scrollTop;
                var scrollHeight = grid.scrollHeight;
                var clientHeight = grid.clientHeight;
                
                if (scrollHeight - scrollTop - clientHeight < 300) {
                    loadMore();
                }
                scrollTimer = null;
            }, 200);
        }

        // ============================================================
        // 6.5 回到顶部
        // ============================================================
        backToTop.addEventListener('click', function() {
            grid.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // ============================================================
        // 6.6 显示状态
        // ============================================================
        function showEmpty() {
            grid.innerHTML =
                '<div class="empty"><div class="icon"><i class="fas fa-image"></i></div><div>暂无壁纸数据</div></div>';
        }

        function showNoMore() {
            var loadingEl = document.getElementById('loadingIndicator');
            if (loadingEl) {
                loadingEl.innerHTML = '— 已全部加载 —';
                loadingEl.className = 'no-more';
                loadingEl.id = '';
            }
        }

        // ============================================================
        // 6.7 搜索
        // ============================================================
        function doSearch() {
            var keyword = searchInput.value.trim().toLowerCase();
            if (!keyword) {
                filteredData = [];
                grid.innerHTML = '';
                currentPage = 1;
                hasMore = true;
                isLoading = false;
                renderPage(1);
                return;
            }
            filteredData = allData.filter(function(item) {
                var copyright = (item.copyright || '').toLowerCase();
                var date = item.date || '';
                var dateClean = date.replace(/-/g, '');
                return copyright.indexOf(keyword) !== -1 || date.indexOf(keyword) !== -1 || dateClean.indexOf(keyword) !== -1;
            });
            if (filteredData.length === 0) {
                grid.innerHTML =
                    '<div class="empty"><div class="icon"><i class="fas fa-search"></i></div><div>没有匹配"' + keyword +
                    '"的壁纸</div></div>';
                return;
            }
            grid.innerHTML = '';
            currentPage = 1;
            hasMore = true;
            isLoading = false;
            totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
            renderPage(1);
        }

        searchBtn.addEventListener('click', doSearch);
        searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSearch(); });
        homeBtn.addEventListener('click', function() {
            searchInput.value = '';
            filteredData = [];
            grid.innerHTML = '';
            currentPage = 1;
            hasMore = true;
            isLoading = false;
            totalPages = Math.ceil(allData.length / PAGE_SIZE);
            renderPage(1);
            toggleNav(false);
        });

        // ============================================================
        // 7. 大图预览
        // ============================================================

        function openPreview(index) {
            if (!allData || allData.length === 0) return;
            if (index < 0) index = 0;
            if (index >= allData.length) index = allData.length - 1;
            currentPreviewIndex = index;
            currentPreviewItem = allData[currentPreviewIndex];
            resetZoom();
            showPreview(currentPreviewIndex);
            previewOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            var imgSrc = getImageUrl(currentPreviewItem.jpg || currentPreviewItem.webp || '');
            previewOverlay.style.setProperty('--bg-url', 'url(' + imgSrc + ')');

            navToggle.classList.add('hidden');
            showToolbar();

            previewImg.onclick = function(e) {
                e.stopPropagation();
                toggleToolbar();
            };

            var startX = 0;
            var startY = 0;

            previewImg.ontouchstart = function(e) {
                var touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
            };

            previewImg.ontouchend = function(e) {
                if (startX === 0) return;
                var touch = e.changedTouches[0];
                var deltaX = touch.clientX - startX;
                var deltaY = touch.clientY - startY;
                
                if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
                    if (deltaX > 0) {
                        showPreview(currentPreviewIndex - 1);
                    } else {
                        showPreview(currentPreviewIndex + 1);
                    }
                    showToolbar();
                }
                startX = 0;
                startY = 0;
            };
        }

        function showPreview(index) {
            if (allData.length === 0) return;
            if (index < 0) index = allData.length - 1;
            if (index >= allData.length) index = 0;
            currentPreviewIndex = index;
            currentPreviewItem = allData[currentPreviewIndex];

            var imgSrc = getImageUrl(currentPreviewItem.jpg || currentPreviewItem.webp || '');
            previewImg.src = imgSrc;
            previewCopyright.textContent = currentPreviewItem.copyright || '';
            previewDate.textContent = currentPreviewItem.date || '';
            previewDesc.textContent = currentPreviewItem.description || '';
            previewOverlay.style.setProperty('--bg-url', 'url(' + imgSrc + ')');
            resetZoom();
        }

        function closePreview() {
            previewOverlay.classList.remove('active');
            document.body.style.overflow = 'auto';
            navToggle.classList.remove('hidden');
            showToolbar();
        }

        function toggleToolbar() {
            toolbarVisible = !toolbarVisible;
            var arrows = document.querySelectorAll('.arrow');
            for (var i = 0; i < arrows.length; i++) {
                arrows[i].style.transition = 'opacity 0.3s ease';
                arrows[i].style.opacity = toolbarVisible ? '1' : '0';
                arrows[i].style.pointerEvents = toolbarVisible ? '' : 'none';
            }
            var toolbars = document.querySelectorAll('.toolbar');
            for (var i = 0; i < toolbars.length; i++) {
                toolbars[i].style.transition = 'opacity 0.3s ease';
                toolbars[i].style.opacity = toolbarVisible ? '1' : '0';
                toolbars[i].style.pointerEvents = toolbarVisible ? '' : 'none';
            }
            var infoPanels = document.querySelectorAll('.info-panel');
            for (var i = 0; i < infoPanels.length; i++) {
                infoPanels[i].style.transition = 'opacity 0.3s ease';
                infoPanels[i].style.opacity = toolbarVisible ? '1' : '0';
                infoPanels[i].style.pointerEvents = toolbarVisible ? '' : 'none';
            }
        }

        function showToolbar() {
            toolbarVisible = true;
            var allElements = document.querySelectorAll('.arrow, .toolbar, .info-panel');
            for (var i = 0; i < allElements.length; i++) {
                allElements[i].style.transition = 'opacity 0.3s ease';
                allElements[i].style.opacity = '1';
                allElements[i].style.pointerEvents = '';
            }
        }

        var prevPreviewBtn = document.getElementById('prevPreviewBtn');
        var nextPreviewBtn = document.getElementById('nextPreviewBtn');

        prevPreviewBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showPreview(currentPreviewIndex - 1);
            showToolbar();
        });

        nextPreviewBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showPreview(currentPreviewIndex + 1);
            showToolbar();
        });

        document.addEventListener('keydown', function(e) {
            if (!previewOverlay.classList.contains('active')) return;
            if (e.key === 'Escape') closePreview();
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                showPreview(currentPreviewIndex - 1);
                showToolbar();
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                showPreview(currentPreviewIndex + 1);
                showToolbar();
            }
        });

        previewOverlay.addEventListener('click', function(e) {
            if (e.target === previewOverlay) closePreview();
        });

        closePreviewBtn.addEventListener('click', closePreview);

                // ============================================================
        // 7.1 下载下拉菜单（支持 mobile 和 mobile_s 动态裁剪）
        // ============================================================
        // 鼠标悬停显示/隐藏下拉菜单
var downloadDropdown = document.querySelector('.dropdown');

downloadDropdown.addEventListener('mouseenter', function(e) {
    downloadMenu.classList.add('show');
});

downloadDropdown.addEventListener('mouseleave', function(e) {
    // 延迟一点点隐藏，防止鼠标移动到菜单上时闪烁
    setTimeout(function() {
        if (!downloadMenu.matches(':hover')) {
            downloadMenu.classList.remove('show');
        }
    }, 100);
});

// 菜单本身也监听 mouseleave，确保鼠标离开菜单时隐藏
downloadMenu.addEventListener('mouseleave', function() {
    downloadMenu.classList.remove('show');
});

// 点击下载选项时执行下载
downloadMenu.querySelectorAll('a').forEach(function(item) {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        var res = this.getAttribute('data-res');
        downloadImage(currentPreviewIndex, res);
        downloadMenu.classList.remove('show');
    });
});

// 移除原来的 document.click 监听（或者保留也可以，但可能会干扰）
// 如果你不想保留，可以注释掉下面这行：
// document.addEventListener('click', function() {
//     downloadMenu.classList.remove('show');
// });

        // 核心下载函数
        function downloadImage(index, resolution) {
            if (!allData || allData.length === 0) return;
            var item = allData[index];
            if (!item) return;
            
            var url = getImageUrl(item.jpg || item.webp || '');
            var resolutions = {
                '4k': { w: 3840, h: 2160 },
                'fhd': { w: 1920, h: 1080 },
                'hd': { w: 1366, h: 768 },
                'mobile': { w: 1080, h: 1920 },
                'mobile_s': { w: 768, h: 1280 }
            };
            var res = resolutions[resolution] || resolutions['fhd'];
            var downloadUrl = url;
            
            // 1. 准备图片下载地址
            // ✅ 这里修改：包含 mobile_s
            if (resolution === 'mobile' || resolution === 'mobile_s') { 
                // 手机模式：我们需要先把原图加载到 Canvas 里截取，所以这里直接用原图清晰地址
                if (url.indexOf('th?id=') !== -1) {
                    var baseUrl = url.split('&')[0];
                    downloadUrl = baseUrl + '&w=1920&h=1080'; // 手机比较吃资源，先拿个稍微清晰的横图
                }
            } else {
                if (url.indexOf('th?id=') !== -1) {
                    var baseUrl = url.split('&')[0];
                    downloadUrl = baseUrl + '&w=' + res.w + '&h=' + res.h;
                }
            }
            
            var fileName = 'wallpaper_' + (item.date || '') + '_' + resolution + '.jpg';
            
            console.log('📥 开始下载: ' + fileName);
            
            fetch(downloadUrl, {
                mode: 'cors',
                headers: { 'Origin': window.location.origin }
            })
            .then(function(response) {
                if (!response.ok) throw new Error('网络请求失败');
                return response.blob();
            })
            .then(function(blob) {
                // ★★★ 核心逻辑在这里 ★★★
                // ✅ 这里修改：包含 mobile_s
                if (resolution === 'mobile' || resolution === 'mobile_s') {
                    // 如果是手机，调用裁剪函数，把当前分辨率传进去
                    return cropToMobile(blob, fileName, resolution);
                } else {
                    // 如果是 4K/FHD/HD，直接下载
                    return downloadBlob(blob, fileName);
                }
            })
            .catch(function(err) {
                console.warn('⚠️ 下载失败，使用备用方法:', err.message);
                // 如果 Fetch 失败，最后兜底用 a 标签直接打开
                var link = document.createElement('a');
                link.href = downloadUrl + (downloadUrl.indexOf('?') === -1 ? '?' : '&') + '_t=' + Date.now();
                link.download = fileName;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }

        // ★★★ 手机竖屏裁剪函数 (支持动态识别 1080x1920 和 768x1280) ★★★
        function cropToMobile(blob, fileName, resolution) {
            return new Promise(function(resolve, reject) {
                var img = new Image();
                var url = URL.createObjectURL(blob);
                
                img.onload = function() {
                    var canvas = document.createElement('canvas');
                    var ctx = canvas.getContext('2d');
                    
                    // ✅ 根据传入的 resolution 动态设定目标尺寸
                    var targetW = 1080;
                    var targetH = 1920;
                    if (resolution === 'mobile_s') {
                        targetW = 768;
                        targetH = 1280;
                    }
                    
                    canvas.width = targetW;
                    canvas.height = targetH;
                    
                    // 计算裁剪区域（从正中间截取）
                    var imgRatio = img.width / img.height;
                    var targetRatio = targetW / targetH;
                    
                    var sx, sy, sw, sh;
                    if (imgRatio > targetRatio) {
                        // 原图太宽了（宽屏），以高度为基准，从左右两边中间取宽度
                        sh = img.height;
                        sw = img.height * targetRatio;
                        sx = (img.width - sw) / 2;
                        sy = 0;
                    } else {
                        // 原图太高了，以宽度为基准，从上下两边中间取高度
                        sw = img.width;
                        sh = img.width / targetRatio;
                        sx = 0;
                        sy = (img.height - sh) / 2;
                    }
                    
                    // 绘制到指定尺寸的画布上
                    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
                    
                    // 将 Canvas 转为 Blob 并触发下载
                    canvas.toBlob(function(croppedBlob) {
                        if (croppedBlob) {
                            downloadBlob(croppedBlob, fileName);
                            resolve();
                        } else {
                            reject('裁剪失败');
                        }
                    }, 'image/jpeg', 0.92);
                    
                    URL.revokeObjectURL(url);
                };
                
                img.onerror = function() {
                    // 如果原图加载失败，直接下载原图 blob
                    console.warn('⚠️ 图片加载失败，直接下载原图');
                    downloadBlob(blob, fileName);
                    resolve();
                };
                img.src = url;
            });
        }

        // ★★★ 通用的 Blob 下载函数 ★★★
        function downloadBlob(blob, fileName) {
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(function() {
                URL.revokeObjectURL(link.href);
            }, 1000);
            console.log('✅ 下载成功: ' + fileName);
        }

        // ============================================================
        // 8. 缩放
        // ============================================================
        var imageContainer = previewImg;

        function updateTransform() {
            previewImg.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ')';
        }

        function resetZoom() {
            scale = 1;
            translateX = 0;
            translateY = 0;
            updateTransform();
        }

        function startDrag(e) {
            if (scale <= 1) return;
            isDragging = true;
            var pos = e.type === 'mousedown' ? e : e.touches[0];
            startX = pos.clientX;
            startY = pos.clientY;
            lastTranslateX = translateX;
            lastTranslateY = translateY;
            imageContainer.style.cursor = 'grabbing';
        }

        function moveDrag(e) {
            if (!isDragging) return;
            e.preventDefault();
            var pos = e.type === 'mousemove' ? e : e.touches[0];
            translateX = lastTranslateX + pos.clientX - startX;
            translateY = lastTranslateY + pos.clientY - startY;
            updateTransform();
        }

        function endDrag() {
            isDragging = false;
            imageContainer.style.cursor = 'grab';
        }

        function wheelZoom(e) {
            e.preventDefault();
            var delta = e.deltaY > 0 ? -0.15 : 0.15;
            scale = Math.min(Math.max(scale + delta, minScale), maxScale);
            if (scale <= 1) { translateX = 0;
                translateY = 0; }
            updateTransform();
        }

        previewImg.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', moveDrag);
        document.addEventListener('mouseup', endDrag);
        previewImg.addEventListener('touchstart', startDrag, { passive: true });
        document.addEventListener('touchmove', moveDrag, { passive: false });
        document.addEventListener('touchend', endDrag, { passive: true });
        previewImg.addEventListener('wheel', wheelZoom, { passive: false });

        // ============================================================
        // 9. ★★★ 启动 ★★★
        // ============================================================
        loadData();
        console.log('✅ 大图预览已加载');
        console.log('💡 留言按钮在导航栏（汉堡菜单）内');
        console.log('💡 评论系统: Twikoo');
        console.log('📜 滚动加载模式已启用');

        window.openComment = openComment;

        (function checkUrlAction() {
            var params = new URLSearchParams(window.location.search);
            if (params.get('action') === 'comment') {
                setTimeout(function() {
                    if (typeof openComment === 'function') {
                        openComment();
                    }
                    if (window.history && window.history.replaceState) {
                        var cleanUrl = window.location.pathname + window.location.hash;
                        window.history.replaceState({}, document.title, cleanUrl);
                    }
                }, 500);
            }
        })();

        // ★★★ 绑定滚动事件 ★★★
        grid.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);
        
        // ★★★ MutationObserver 只监控新增卡片，不触发加载 ★★★
        var observer = new MutationObserver(function() {
            // 只更新回到顶部按钮状态
            if (grid.scrollTop > 500) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });
        observer.observe(grid, { childList: true, subtree: true });
