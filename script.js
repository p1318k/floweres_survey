document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const gallery = document.getElementById('gallery');
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const closeModal = document.getElementsByClassName('close')[0];

    fileInput.addEventListener('change', handleFileSelect);
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
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
                return cell.l.Target;
            }
        }
        
        // 셀 값이 URL인 경우
        if (cell && cell.v && typeof cell.v === 'string') {
            const cellValue = cell.v;
            console.log('Cell value:', cellValue);
            
            // HTTP/HTTPS URL 체크
            const urlMatch = cellValue.match(/https?:\/\/[^\s\)]+/);
            if (urlMatch) {
                return urlMatch[0];
            }
            
            // 이미지 확장자가 있는 경우
            if (cellValue.includes('.jpg') || cellValue.includes('.jpeg') || 
                cellValue.includes('.png') || cellValue.includes('.gif') || 
                cellValue.includes('.webp') || cellValue.includes('.bmp')) {
                return cellValue.trim();
            }
        }
        
        return null;
    }

    function displayGallery(items) {
        if (items.length === 0) {
            gallery.innerHTML = '<div class="loading">표시할 이미지가 없습니다.</div>';
            return;
        }

        gallery.innerHTML = '';
        
        items.forEach(item => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            galleryItem.innerHTML = `
                <img src="${item.imageUrl}" alt="${item.name}" loading="lazy" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuydtOuvuOyngCDsl4bsnYw8L3RleHQ+PC9zdmc+'" />
                <div class="gallery-item-title">${item.name}</div>
            `;
            
            galleryItem.addEventListener('click', () => openModal(item));
            gallery.appendChild(galleryItem);
        });
    }

    function openModal(item) {
        modalImage.src = item.imageUrl;
        modalTitle.textContent = item.name;
        modal.style.display = 'block';
    }
});
