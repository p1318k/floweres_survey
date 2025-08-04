document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const gallery = document.getElementById('gallery');
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const closeModal = document.getElementsByClassName('close')[0];
    const testButton = document.getElementById('testButton');

    // 요소 존재 확인
    if (!fileInput || !gallery || !modal || !modalImage || !modalTitle || !closeModal) {
        console.error('Required DOM elements not found');
        console.error('fileInput:', fileInput);
        console.error('gallery:', gallery);
        console.error('modal:', modal);
        console.error('modalImage:', modalImage);
        console.error('modalTitle:', modalTitle);
        console.error('closeModal:', closeModal);
        return;
    }

    console.log('✅ All required DOM elements found successfully');
    console.log('📋 Excel 이미지 갤러리 초기화 완료');

    fileInput.addEventListener('change', handleFileSelect);
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    
    // 테스트 버튼이 존재하는 경우에만 이벤트 리스너 추가
    if (testButton) {
        testButton.addEventListener('click', () => {
            console.clear();
            console.log('=== 네이버 설문조사 이미지 테스트 시작 ===');
            console.log('⚠️  CORS 정책으로 인해 네이버 설문조사 이미지는 직접 로드가 제한될 수 있습니다.');
            console.log('📋 직접 이미지 URL을 사용하여 이미지 로드를 시도합니다.');
            
            const originalWrapperUrl = 'https://survey.naver.com/form/imageView?src=https%3A%2F%2Fsurvey.naver.com%2Fform%2Fimages%2F20250719115938855-758762-d1dde9ec.png';
            const directImageUrl = 'https://survey.naver.com/form/images/20250719115938855-758762-d1dde9ec.png';
            
            console.log('원본 래퍼 URL:', originalWrapperUrl);
            console.log('직접 이미지 URL:', directImageUrl);
            
            const testData = [
                {
                    name: '하은선 (래퍼 URL)',
                    imageUrl: originalWrapperUrl
                },
                {
                    name: '하은선 (직접 URL)',
                    imageUrl: directImageUrl
                },
                {
                    name: '테스트용 이미지 (작동 확인)',
                    imageUrl: 'https://picsum.photos/300/400?random=1'
                }
            ];
            
            console.log('테스트 데이터:', testData);
            displayGallery(testData);
        });
    } else {
        console.warn('Test button not found, skipping test button event listener');
    }

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
                    
                    // 추출된 URL이 올바른 직접 이미지 URL인지 확인
                    if (processedUrl.includes('survey.naver.com/form/images/')) {
                        console.log('Direct image URL confirmed:', processedUrl);
                        return processedUrl;
                    }
                }
            }
            
            // 이미 직접 이미지 URL인 경우 (사용자가 제공한 실제 URL 패턴)
            if (url.includes('survey.naver.com/form/images/') && url.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                console.log('Direct Naver image URL detected:', url);
                return url;
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
                statusDiv.textContent = '이미지 로드 실패';
                if (!this.parentElement.querySelector('.load-status')) {
                    this.parentElement.appendChild(statusDiv);
                }
            };
            
            img.onload = function() {
                console.log(`Image loaded successfully for ${item.name}`);
                const statusDiv = this.parentElement.querySelector('.load-status');
                if (statusDiv) {
                    statusDiv.remove();
                }
            };
            
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
        
        // 네이버 설문조사 URL인 경우 특별 처리
        if (originalUrl.includes('survey.naver.com/form/imageView')) {
            console.log(`Naver survey URL detected, extracting direct image URL...`);
            
            // 직접 이미지 URL 추출
            const srcMatch = originalUrl.match(/src=([^&]+)/);
            if (srcMatch) {
                const directUrl = decodeURIComponent(srcMatch[1]);
                console.log(`Trying direct Naver image URL: ${directUrl}`);
                
                // 직접 URL로 시도
                imgElement.src = directUrl;
                return;
            }
        }
        
        // 일반 URL 또는 네이버 URL 추출 실패한 경우
        tryOriginalUrl();
        
        function tryOriginalUrl() {
            imgElement.src = originalUrl;
            
            // 타임아웃 설정 (3초 후 실패 처리로 단축)
            setTimeout(() => {
                if (!imgElement.complete || imgElement.naturalWidth === 0) {
                    console.log(`Image load timeout for ${name}, showing error image`);
                    imgElement.src = createErrorImageDataUrl(name);
                    imgElement.style.backgroundColor = '#f8f9fa';
                    imgElement.style.border = '2px dashed #dee2e6';
                }
            }, 3000);
        }
    }

    function createErrorImageDataUrl(name) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 250;
        const ctx = canvas.getContext('2d');
        
        // 그라데이션 배경
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, '#fff5f5');
        gradient.addColorStop(1, '#fed7d7');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 300, 250);
        
        // 테두리
        ctx.strokeStyle = '#e53e3e';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(10, 10, 280, 230);
        
        // 경고 아이콘 (삼각형)
        ctx.fillStyle = '#e53e3e';
        ctx.beginPath();
        ctx.moveTo(150, 40);
        ctx.lineTo(130, 70);
        ctx.lineTo(170, 70);
        ctx.closePath();
        ctx.fill();
        
        // 느낌표
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('!', 150, 65);
        
        // 메인 텍스트
        ctx.fillStyle = '#2d3748';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('이미지 로드 실패', 150, 100);
        
        ctx.font = '14px Arial';
        ctx.fillStyle = '#4a5568';
        ctx.fillText(name, 150, 120);
        
        // CORS 설명
        ctx.font = '12px Arial';
        ctx.fillStyle = '#718096';
        ctx.fillText('CORS 정책으로 인한 접근 제한', 150, 145);
        ctx.fillText('네이버 설문조사 이미지는', 150, 165);
        ctx.fillText('보안상 직접 로드가 제한됩니다', 150, 180);
        
        // 해결방법 안내
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#2b6cb0';
        ctx.fillText('💡 해결방법:', 150, 205);
        ctx.font = '10px Arial';
        ctx.fillText('1. 이미지를 다운로드 후 로컬에 저장', 150, 220);
        ctx.fillText('2. 다른 이미지 호스팅 서비스 이용', 150, 235);
        
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
