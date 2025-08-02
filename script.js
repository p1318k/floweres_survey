document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const gallery = document.getElementById('gallery');
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const closeModal = document.getElementsByClassName('close')[0];
    const testButton = document.getElementById('testButton');
    const testWorkingButton = document.getElementById('testWorkingButton');
    const urlInput = document.getElementById('urlInput');
    const urlTestButton = document.getElementById('urlTestButton');

    fileInput.addEventListener('change', handleFileSelect);
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    
    // 테스트 버튼 이벤트
    testButton.addEventListener('click', () => {
        console.clear(); // 콘솔 클리어
        console.log('=== 하은선 이미지 테스트 시작 ===');
        
        const originalUrl = 'https://survey.naver.com/form/imageView?src=https%3A%2F%2Fsurvey.naver.com%2Fform%2Fimages%2F20250719115938855-758762-d1dde9ec.png';
        console.log('원본 URL:', originalUrl);
        
        // URL 디코딩 테스트
        const srcMatch = originalUrl.match(/src=([^&]+)/);
        if (srcMatch) {
            const decodedUrl = decodeURIComponent(srcMatch[1]);
            console.log('디코딩된 URL:', decodedUrl);
        }
        
        const testData = [{
            name: '하은선',
            imageUrl: originalUrl
        }];
        console.log('테스트 데이터:', testData);
        displayGallery(testData);
    });
    
    // 작동 테스트 버튼 이벤트
    testWorkingButton.addEventListener('click', () => {
        console.clear();
        console.log('=== 작동 테스트 시작 ===');
        
        const testData = [{
            name: '테스트 고양이',
            imageUrl: 'https://cataas.com/cat'
        }];
        console.log('테스트 데이터:', testData);
        displayGallery(testData);
    });
    
    // URL 테스트 버튼 이벤트
    urlTestButton.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (!url) {
            alert('URL을 입력해주세요.');
            return;
        }
        
        const testData = [{
            name: 'URL 테스트',
            imageUrl: url
        }];
        console.log('Testing with custom URL:', testData);
        displayGallery(testData);
    });

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        gallery.innerHTML = '<div class="loading">파일을 읽는 중...</div>';

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // 하이퍼링크 정보를 보존하기 위해 다른 방법으로 파싱
                parseExcelDataWithHyperlinks(workbook, firstSheet);
            } catch (error) {
                gallery.innerHTML = '<div class="loading">파일을 읽는 중 오류가 발생했습니다.</div>';
                console.error('Excel parsing error:', error);
            }
        };
        reader.readAsBinaryString(file);
    }

    function parseExcelDataWithHyperlinks(workbook, sheet) {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        console.log('Sheet range:', range);
        
        // 헤더 행 읽기
        const headers = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            const cell = sheet[cellAddress];
            headers.push(cell ? cell.v : '');
        }
        
        console.log('Headers:', headers);
        
        const nameColIndex = findColumnIndex(headers, '이름');
        const imageColIndex = findColumnIndex(headers, '사진');
        
        console.log('Name column index:', nameColIndex);
        console.log('Image column index:', imageColIndex);
        
        if (nameColIndex === -1 || imageColIndex === -1) {
            gallery.innerHTML = '<div class="loading">"이름" 또는 "사진" 열을 찾을 수 없습니다.<br>Available columns: ' + headers.join(', ') + '</div>';
            return;
        }
        
        const items = [];
        
        // 데이터 행 읽기 (헤더 제외)
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
            const nameCellAddress = XLSX.utils.encode_cell({ r: row, c: nameColIndex });
            const imageCellAddress = XLSX.utils.encode_cell({ r: row, c: imageColIndex });
            
            const nameCell = sheet[nameCellAddress];
            const imageCell = sheet[imageCellAddress];
            
            console.log(`Row ${row}:`, {
                nameCell: nameCell,
                imageCell: imageCell,
                nameCellAddress,
                imageCellAddress
            });
            
            if (nameCell && imageCell) {
                const name = nameCell.v;
                const imageUrl = extractImageUrlFromCell(imageCell, sheet);
                
                console.log('Name:', name, 'URL:', imageUrl);
                
                if (name && imageUrl) {
                    items.push({ name, imageUrl });
                }
            }
        }
        
        console.log('Final items:', items);
        displayGallery(items);
    }

    function findColumnIndex(headers, searchText) {
        return headers.findIndex(header => 
            header && header.toString().includes(searchText)
        );
    }

    function extractImageUrlFromCell(cell, sheet) {
        console.log('Processing cell:', cell);
        
        // 하이퍼링크가 있는 경우
        if (cell && cell.l) {
            console.log('Found hyperlink:', cell.l);
            if (cell.l.Target) {
                return processImageUrl(cell.l.Target);
            }
        }
        
        // 셀 값이 URL인 경우
        if (cell && cell.v && typeof cell.v === 'string') {
            const cellValue = cell.v;
            console.log('Cell value:', cellValue);
            
            // HTTP/HTTPS URL 체크
            const urlMatch = cellValue.match(/https?:\/\/[^\s\)]+/);
            if (urlMatch) {
                return processImageUrl(urlMatch[0]);
            }
            
            // 이미지 확장자가 있는 경우
            if (cellValue.includes('.jpg') || cellValue.includes('.jpeg') || 
                cellValue.includes('.png') || cellValue.includes('.gif') || 
                cellValue.includes('.webp') || cellValue.includes('.bmp')) {
                return processImageUrl(cellValue.trim());
            }
        }
        
        return null;
    }

    function processImageUrl(url) {
        // URL 디코딩
        let processedUrl = url;
        
        try {
            // 네이버 설문조사 이미지 URL 처리
            if (url.includes('survey.naver.com/form/imageView')) {
                const srcMatch = url.match(/src=([^&]+)/);
                if (srcMatch) {
                    processedUrl = decodeURIComponent(srcMatch[1]);
                    console.log('Extracted Naver survey image URL:', processedUrl);
                }
            }
            
            // 일반적인 URL 디코딩
            if (processedUrl.includes('%')) {
                processedUrl = decodeURIComponent(processedUrl);
            }
        } catch (error) {
            console.log('URL processing error:', error);
        }
        
        return processedUrl;
    }

    function displayGallery(items) {
        if (items.length === 0) {
            gallery.innerHTML = '<div class="loading">표시할 이미지가 없습니다.</div>';
            return;
        }

        gallery.innerHTML = '';
        
        items.forEach((item, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            const img = document.createElement('img');
            img.alt = item.name;
            img.loading = 'lazy';
            
            // 이미지 로드 에러 핸들링
            img.onerror = function() {
                console.log(`Image load failed for ${item.name}: ${item.imageUrl}`);
                this.src = createErrorImageDataUrl(item.name);
                this.style.backgroundColor = '#f8f9fa';
                this.style.border = '2px dashed #dee2e6';
                
                // 상태 표시 추가
                const statusDiv = this.parentElement.querySelector('.load-status') || document.createElement('div');
                statusDiv.className = 'load-status error';
                statusDiv.innerHTML = `❌ 이미지 로드 실패<br><small>원본 URL 확인 필요</small>`;
                if (!this.parentElement.querySelector('.load-status')) {
                    this.parentElement.appendChild(statusDiv);
                }
            };
            
            img.onload = function() {
                console.log(`Image loaded successfully for ${item.name}`);
                const statusDiv = this.parentElement.querySelector('.load-status');
                if (statusDiv) {
                    statusDiv.className = 'load-status success';
                    statusDiv.innerHTML = '✅ 이미지 로드 완료';
                    setTimeout(() => statusDiv.remove(), 2000);
                }
            };
            
            // 로딩 상태 표시
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'load-status loading';
            loadingDiv.innerHTML = '🔄 이미지 로딩 중...';
            galleryItem.appendChild(loadingDiv);
            
            // 다양한 이미지 URL 시도
            tryLoadImage(img, item.imageUrl, item.name);
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'gallery-item-title';
            titleDiv.textContent = item.name;
            
            // URL 정보 표시 (디버깅용)
            const urlInfo = document.createElement('div');
            urlInfo.className = 'url-info';
            urlInfo.innerHTML = `
                <small>URL: <a href="${item.imageUrl}" target="_blank" rel="noopener">${item.imageUrl.length > 50 ? item.imageUrl.substring(0, 50) + '...' : item.imageUrl}</a></small>
            `;
            
            galleryItem.appendChild(img);
            galleryItem.appendChild(titleDiv);
            galleryItem.appendChild(urlInfo);
            
            galleryItem.addEventListener('click', () => openModal(item));
            gallery.appendChild(galleryItem);
        });
    }

    function tryLoadImage(imgElement, originalUrl, name) {
        console.log(`Trying to load image for ${name}: ${originalUrl}`);
        
        // 방법 1: fetch API로 blob 가져오기 시도
        tryFetchAsBlob(imgElement, originalUrl, name)
            .catch(() => {
                console.log(`Fetch failed for ${name}, trying direct load`);
                // 방법 2: 직접 로드 시도
                return tryDirectLoad(imgElement, originalUrl, name);
            })
            .catch(() => {
                console.log(`Direct load failed for ${name}, trying alternatives`);
                // 방법 3: 대안 방법들 시도
                setTimeout(() => tryAlternativeImageLoad(imgElement, originalUrl, name), 1000);
            });
    }

    function tryFetchAsBlob(imgElement, url, name) {
        return new Promise((resolve, reject) => {
            // 네이버 설문조사 URL 처리
            let fetchUrl = url;
            if (url.includes('survey.naver.com/form/imageView')) {
                const srcMatch = url.match(/src=([^&]+)/);
                if (srcMatch) {
                    fetchUrl = decodeURIComponent(srcMatch[1]);
                    console.log(`Extracted URL for fetch: ${fetchUrl}`);
                }
            }
            
            fetch(fetchUrl, {
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Accept': 'image/*',
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                imgElement.onload = () => {
                    console.log(`Fetch successful for ${name}`);
                    URL.revokeObjectURL(blobUrl); // 메모리 정리
                    resolve();
                };
                imgElement.onerror = () => {
                    URL.revokeObjectURL(blobUrl);
                    reject(new Error('Blob load failed'));
                };
                imgElement.src = blobUrl;
            })
            .catch(error => {
                console.log(`Fetch error for ${name}:`, error);
                reject(error);
            });
        });
    }

    function tryDirectLoad(imgElement, originalUrl, name) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                console.log(`Direct load successful for ${name}`);
                imgElement.src = originalUrl;
                resolve();
            };
            img.onerror = function() {
                console.log(`Direct load failed for ${name}`);
                reject(new Error('Direct load failed'));
            };
            img.src = originalUrl;
            
            // 타임아웃 설정
            setTimeout(() => {
                if (!img.complete) {
                    reject(new Error('Direct load timeout'));
                }
            }, 5000);
        });
    }

    function tryAlternativeImageLoad(imgElement, originalUrl, name) {
        console.log(`Starting alternative image load for ${name}`);
        
        // 네이버 설문조사 URL에서 실제 이미지 URL 추출
        let directImageUrl = originalUrl;
        if (originalUrl.includes('survey.naver.com/form/imageView')) {
            const srcMatch = originalUrl.match(/src=([^&]+)/);
            if (srcMatch) {
                directImageUrl = decodeURIComponent(srcMatch[1]);
                console.log(`Extracted direct image URL: ${directImageUrl}`);
                
                // 직접 URL로 시도
                const directImg = new Image();
                directImg.crossOrigin = 'anonymous';
                directImg.onload = function() {
                    console.log(`Direct image URL successful for ${name}`);
                    imgElement.src = directImageUrl;
                    return;
                };
                directImg.onerror = function() {
                    console.log(`Direct image URL failed, trying proxies`);
                    tryProxies();
                };
                directImg.src = directImageUrl;
                return;
            }
        }
        
        tryProxies();
        
        function tryProxies() {
            // CORS 프록시 서버들을 통해 시도
            const corsProxies = [
                'https://api.allorigins.win/raw?url=',
                'https://corsproxy.io/?',
                'https://cors.bridged.cc/',
                'https://thingproxy.freeboard.io/fetch/'
            ];
            
            let proxyIndex = 0;
            
            function tryNextProxy() {
                if (proxyIndex >= corsProxies.length) {
                    console.log(`All proxy attempts failed for ${name}`);
                    // 최후의 수단: base64 변환된 placeholder 이미지
                    imgElement.src = createErrorImageDataUrl(name);
                    return;
                }
                
                const proxyUrl = corsProxies[proxyIndex] + encodeURIComponent(directImageUrl);
                console.log(`Trying proxy ${proxyIndex + 1} for ${name}: ${proxyUrl}`);
                
                const testImg = new Image();
                testImg.crossOrigin = 'anonymous';
                testImg.onload = function() {
                    console.log(`Proxy ${proxyIndex + 1} successful for ${name}`);
                    imgElement.src = proxyUrl;
                };
                testImg.onerror = function() {
                    console.log(`Proxy ${proxyIndex + 1} failed for ${name}`);
                    proxyIndex++;
                    setTimeout(tryNextProxy, 1000); // 1초 대기 후 다음 프록시 시도
                };
                testImg.src = proxyUrl;
            }
            
            tryNextProxy();
        }
    }

    function createErrorImageDataUrl(name) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        // 그라데이션 배경
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(1, '#e9ecef');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 300, 200);
        
        // 테두리
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(10, 10, 280, 180);
        
        // 아이콘 (이미지 없음)
        ctx.fillStyle = '#6c757d';
        ctx.fillRect(140, 60, 20, 15);
        ctx.fillRect(135, 65, 30, 20);
        ctx.fillRect(130, 75, 40, 30);
        
        // 텍스트
        ctx.fillStyle = '#495057';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('이미지를 불러올 수 없습니다', 150, 120);
        
        ctx.font = '14px Arial';
        ctx.fillStyle = '#6c757d';
        ctx.fillText(name, 150, 140);
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#868e96';
        ctx.fillText('네트워크 오류 또는 CORS 정책', 150, 160);
        
        return canvas.toDataURL();
    }

    function openModal(item) {
        modalTitle.textContent = item.name;
        modal.style.display = 'block';
        
        // 모달 이미지 로드 처리
        modalImage.onerror = function() {
            console.log(`Modal image load failed for ${item.name}: ${item.imageUrl}`);
            this.src = createErrorImageDataUrl(item.name);
            this.style.backgroundColor = '#f8f9fa';
            this.style.border = '2px dashed #dee2e6';
        };
        
        modalImage.onload = function() {
            console.log(`Modal image loaded successfully for ${item.name}`);
        };
        
        // 이미지 로드 시도
        tryLoadImage(modalImage, item.imageUrl, item.name);
    }
});
