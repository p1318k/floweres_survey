document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const gallery = document.getElementById('gallery');
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    const closeModal = document.querySelector('.close');

    fileInput.addEventListener('change', handleFileUpload);
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        showLoading();
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                // 하이퍼링크 정보를 포함한 데이터 추출
                const jsonData = extractDataWithHyperlinks(worksheet);
                
                processExcelData(jsonData, worksheet);
            } catch (error) {
                showError('엑셀 파일을 읽는 중 오류가 발생했습니다.');
                console.error('Error reading Excel file:', error);
            } finally {
                // 파일 입력 값을 초기화하여 같은 파일을 다시 선택할 수 있도록 함
                fileInput.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function extractDataWithHyperlinks(worksheet) {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const data = [];
        
        // 헤더 행 추출
        const headers = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
            const cell = worksheet[cellAddress];
            headers.push(cell ? (cell.v || '') : '');
        }
        
        // 데이터 행 추출
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
            const rowData = {};
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];
                const header = headers[col - range.s.c];
                
                if (cell) {
                    // 하이퍼링크가 있는 경우 URL을 사용, 없으면 일반 값 사용
                    if (cell.l && cell.l.Target) {
                        rowData[header] = cell.l.Target;
                    } else {
                        rowData[header] = cell.v || '';
                    }
                } else {
                    rowData[header] = '';
                }
            }
            data.push(rowData);
        }
        
        return data;
    }

    function processExcelData(data, worksheet) {
        gallery.innerHTML = '';
        
        if (data.length === 0) {
            showError('엑셀 파일에 데이터가 없습니다.');
            return;
        }

        // 첫 번째 행에서 사용 가능한 컬럼 이름들을 확인
        const firstRow = data[0];
        const availableColumns = Object.keys(firstRow);
        console.log('사용 가능한 컬럼들:', availableColumns);

        // 다양한 가능한 컬럼 이름들 정의
        const nameColumns = ['이름', 'name', 'Name', 'NAME', '성명', '이름 ', ' 이름', '이름(*)', '이름*', '*이름', '이름(*)'];
        const photoColumns = ['사진', 'photo', 'Photo', 'PHOTO', '이미지', 'image', 'Image', 'url', 'URL', '링크', 'link', '사진 ', ' 사진', '사진(*)', '사진*', '*사진', '사진(*)'];

        // 실제 컬럼 이름 찾기 (부분 매칭도 지원)
        let nameColumn = nameColumns.find(col => availableColumns.includes(col));
        let photoColumn = photoColumns.find(col => availableColumns.includes(col));

        // 정확한 매칭이 없으면 부분 매칭 시도
        if (!nameColumn) {
            nameColumn = availableColumns.find(col => 
                col.includes('이름') || col.includes('name') || col.includes('Name') || col.includes('성명')
            );
        }

        if (!photoColumn) {
            photoColumn = availableColumns.find(col => 
                col.includes('사진') || col.includes('photo') || col.includes('Photo') || 
                col.includes('이미지') || col.includes('image') || col.includes('Image') ||
                col.includes('url') || col.includes('URL') || col.includes('링크') || col.includes('link')
            );
        }

        if (!nameColumn || !photoColumn) {
            let errorMsg = '필요한 컬럼을 찾을 수 없습니다.\n';
            errorMsg += `사용 가능한 컬럼: ${availableColumns.join(', ')}\n`;
            errorMsg += `필요한 컬럼: "이름" 또는 유사한 이름, "사진" 또는 유사한 이름`;
            showError(errorMsg);
            return;
        }

        console.log(`사용할 컬럼 - 이름: "${nameColumn}", 사진: "${photoColumn}"`);

        // 이름이 있는 모든 데이터를 포함 (URL이 유효하지 않아도 플레이스홀더로 표시)
        const items = data.filter(row => row[nameColumn]).map((row, index) => {
            let photoUrl = row[photoColumn];
            // 이미 extractDataWithHyperlinks에서 하이퍼링크를 처리했으므로 추가 처리 불필요
            return { ...row, [photoColumn]: photoUrl };
        }).filter(row => row[photoColumn]);
        
        if (items.length === 0) {
            showError(`"${nameColumn}"과 "${photoColumn}" 열에 데이터가 있는 행을 찾을 수 없습니다.`);
            return;
        }

        const validUrls = items.filter(item => isValidUrl(item[photoColumn])).length;
        const invalidUrls = items.length - validUrls;

        console.log(`총 ${items.length}개 항목 발견 (유효한 URL: ${validUrls}개, 무효한 URL: ${invalidUrls}개)`);
        
        if (invalidUrls > 0) {
            showInfo(`${items.length}개의 항목을 표시합니다. ${invalidUrls}개는 유효하지 않은 URL로 인해 플레이스홀더 이미지로 표시됩니다.`);
        }

        items.forEach((item, index) => {
            createGalleryItem(item[nameColumn], item[photoColumn], index);
        });
    }
    
    function convertGoogleDriveUrl(url) {
        if (!url || typeof url !== 'string') return url;

        // Google Drive 공유 링크 패턴 매칭
        let fileId = null;
        
        // drive.google.com/open?id= 패턴
        let match = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
        if (match) {
            fileId = match[1];
        }
        
        // drive.google.com/file/d/ID/view 패턴
        if (!fileId) {
            match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match) {
                fileId = match[1];
            }
        }
        
        if (!fileId) return url;
        
        // 여러 형식으로 시도할 수 있도록 배열 반환
        return {
            primary: `https://drive.usercontent.google.com/download?id=${fileId}&export=view&authuser=0`,
            fallback1: `https://drive.google.com/uc?export=view&id=${fileId}`,
            fallback2: `https://lh3.googleusercontent.com/d/${fileId}`,
            original: url
        };
    }

    function isValidUrl(string) {
        if (!string || typeof string !== 'string') return false;
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    function createGalleryItem(name, imageUrl, index) {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        
        const img = document.createElement('img');
        
        // Google Drive URL 변환
        const convertedUrls = convertGoogleDriveUrl(imageUrl);
        
        // 변환된 URL이 객체인 경우 (Google Drive URL)
        if (typeof convertedUrls === 'object' && convertedUrls.primary) {
            img.src = convertedUrls.primary;
            
            let fallbackIndex = 0;
            const fallbacks = [convertedUrls.fallback1, convertedUrls.fallback2];
            
            img.onerror = function() {
                if (fallbackIndex < fallbacks.length) {
                    console.warn(`이미지 로드 실패, fallback ${fallbackIndex + 1} 시도: ${fallbacks[fallbackIndex]}`);
                    this.src = fallbacks[fallbackIndex];
                    fallbackIndex++;
                } else {
                    console.warn(`모든 Google Drive URL 실패: ${imageUrl}`);
                    this.src = getPlaceholderImage();
                    this.alt = '이미지를 불러올 수 없습니다';
                    this.title = `Google Drive 이미지 로드 실패\n원본: ${imageUrl}`;
                }
            };
        } 
        // 일반 URL인 경우
        else if (isValidUrl(convertedUrls || imageUrl)) {
            img.src = convertedUrls || imageUrl;
            
            img.onerror = function() {
                console.warn(`이미지 로드 실패: ${imageUrl}`);
                this.src = getPlaceholderImage();
                this.alt = '이미지를 불러올 수 없습니다';
            };
        }
        // 유효하지 않은 URL인 경우
        else {
            img.src = getPlaceholderImage();
            img.title = `원본 데이터: ${imageUrl}`;
        }
        
        img.alt = name;
        img.loading = 'lazy';
        
        img.addEventListener('click', () => {
            const urlToOpen = typeof convertedUrls === 'object' ? convertedUrls.original : (convertedUrls || imageUrl);
            if (isValidUrl(urlToOpen)) {
                // 새 탭에서 원본 Google Drive 링크 열기
                window.open(urlToOpen, '_blank');
            } else {
                showInfo(`"${name}"의 이미지 URL이 유효하지 않습니다.\n원본 데이터: ${imageUrl}`);
            }
        });
        
        const caption = document.createElement('div');
        caption.className = 'caption';
        caption.textContent = name;
        
        // URL이 유효하지 않은 경우 표시
        const finalUrl = typeof convertedUrls === 'object' ? convertedUrls.primary : convertedUrls;
        if (!isValidUrl(finalUrl)) {
            caption.style.color = '#e74c3c';
            caption.title = `유효하지 않은 URL: ${imageUrl}`;
        }
        
        galleryItem.appendChild(img);
        galleryItem.appendChild(caption);
        gallery.appendChild(galleryItem);
    }

    function getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBMMTMwIDEzMEg3MEwxMDAgNzBaIiBmaWxsPSIjOUI5QjlCIi8+CjxjaXJjbGUgY3g9IjEzMCIgY3k9IjgwIiByPSIxMCIgZmlsbD0iIzlCOUI5QiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QjlCIiBmb250LXNpemU9IjEyIj5VUkwg7ZeE7JqUPC90ZXh0Pgo8L3N2Zz4K';
    }

    function openModal(imageUrl, name) {
        modalImage.src = imageUrl;
        modalCaption.textContent = name;
        modal.style.display = 'flex';
    }

    function showLoading() {
        gallery.innerHTML = '<div class="loading">파일을 처리하는 중...</div>';
    }

    function showError(message) {
        gallery.innerHTML = `<div class="error">${message.replace(/\n/g, '<br>')}</div>`;
    }

    function showInfo(message) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info';
        infoDiv.style.cssText = `
            text-align: center;
            padding: 15px;
            margin: 20px 0;
            background-color: #e8f4f8;
            border: 1px solid #bee5eb;
            border-radius: 6px;
            color: #0c5460;
        `;
        infoDiv.innerHTML = message.replace(/\n/g, '<br>');
        gallery.insertBefore(infoDiv, gallery.firstChild);
    }
});
