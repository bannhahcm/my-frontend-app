// =================================================================
// ============== LOGIC CHÍNH CỦA TRANG ============================
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

  // --- CÀI ĐẶT ---
  const API_URL = 'http://localhost:3000'; // Địa chỉ API server thật của bạn
  const searchBox = document.getElementById('search-box');
  const statusDiv = document.getElementById('status');
  const hitsContainer = document.getElementById('hits-container');
  const searchPopup = document.getElementById('search-popup');
  const closePopupButton = document.getElementById('close-popup-button');
  const headerSearchButton = document.getElementById('header-search-button');
  const searchForm = document.getElementById('search-form');
  const popupSearchInput = document.getElementById('popup-search-input');
  const suggestionsContainer = document.getElementById('search-suggestions-container');
  const mainContent = document.getElementById('main-content');
  const resultsPage = document.getElementById('search-results-page');


  // --- LOGIC CHO POPUP TÌM KIẾM ---
  function showPopup() {
    searchPopup.style.display = 'flex';
    popupSearchInput.focus();
  }

  function hidePopup() {
    searchPopup.style.display = 'none';
  }

  headerSearchButton.addEventListener('click', showPopup);
  closePopupButton.addEventListener('click', hidePopup);
  searchPopup.addEventListener('click', (event) => {
    if (event.target === searchPopup) {
      hidePopup();
    }
  });


  // --- HÀM GỌI API VÀ HIỂN THỊ KẾT QUẢ ---
  
  // Hàm này giúp chúng ta không gọi API liên tục mỗi khi gõ
  function debounce(func, delay = 350) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

  // Hàm gọi API để lấy kết quả tìm kiếm thật
  async function fetchSearchResults(query) {
    if (!query) return [];
    try {
      // Gửi yêu cầu mạng thực sự đến API server
      const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Lỗi mạng hoặc server API không phản hồi.');
      }
      const results = await response.json();
      return results;
    } catch (error) {
      console.error('Lỗi khi gọi API tìm kiếm:', error);
      return []; // Trả về mảng rỗng nếu có lỗi
    }
  }

  // Hàm hiển thị gợi ý autocomplete
  async function renderAutocomplete(query) {
    const results = await fetchSearchResults(query);
    suggestionsContainer.innerHTML = '';
    suggestionsContainer.style.display = 'block';

    if (results.length === 0) {
      suggestionsContainer.style.display = 'none';
      return;
    }

    const groupEl = document.createElement('div');
    groupEl.className = 'suggestion-group';
    const listEl = document.createElement('ul');
    listEl.className = 'suggestion-list';

    results.slice(0, 5).forEach(item => { // Chỉ hiển thị 5 gợi ý đầu tiên
      const itemEl = document.createElement('li');
      itemEl.className = 'suggestion-item';
      itemEl.textContent = item.title;
      itemEl.addEventListener('click', () => {
        popupSearchInput.value = item.title;
        searchForm.requestSubmit();
      });
      listEl.appendChild(itemEl);
    });
    groupEl.appendChild(listEl);
    suggestionsContainer.appendChild(groupEl);
  }
  
  // Hàm hiển thị trang kết quả tìm kiếm chính
  function renderMainResultsPage(query, hits) {
    mainContent.style.display = 'block';
    resultsPage.style.display = 'block';

    document.getElementById('search-term').textContent = query;
    const resultsList = document.getElementById('results-list');
    const resultsCountEl = document.getElementById('results-count');
    const noResultsMessage = document.getElementById('no-results-message');

    resultsCountEl.textContent = hits.length;
    resultsList.innerHTML = '';
    
    if (hits.length === 0) {
      noResultsMessage.style.display = 'block';
    } else {
      noResultsMessage.style.display = 'none';
      hits.forEach(hit => {
        const hitElement = document.createElement('div');
        hitElement.className = 'hit';
        const typeText = (hit.searchable_type || 'DATA').replace('_', ' ');
        const badge = `<span class="hit-type-badge badge-${hit.searchable_type}">${typeText}</span>`;
        const imageUrl = hit.image_url || 'https://via.placeholder.com/150';
        
        hitElement.innerHTML = `
          <img src="${imageUrl}" alt="${hit.title}" class="hit-image">
          <div class="hit-content">
            ${badge}
            <h2><a href="${hit.url || '#'}" target="_blank" rel="noopener noreferrer">${hit.title}</a></h2>
            <p>${hit.description || ''}</p>
          </div>
        `;
        resultsList.appendChild(hitElement);
      });
    }
  }


  // --- GẮN CÁC SỰ KIỆN VÀO GIAO DIỆN ---

  // Autocomplete khi gõ trong popup
  popupSearchInput.addEventListener('input', debounce(async (event) => {
    const query = event.target.value;
    if (query.length < 2) {
      suggestionsContainer.style.display = 'none';
      return;
    }
    await renderAutocomplete(query);
  }));

  // Xử lý khi submit form tìm kiếm
  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = popupSearchInput.value.trim();
    if (query) {
      hidePopup();
      renderMainResultsPage(query, []); // Hiển thị giao diện ngay lập tức với thông báo đang tải
      const finalHits = await fetchSearchResults(query);
      renderMainResultsPage(query, finalHits);
    }
  });

  // Ban đầu ẩn trang kết quả đi
  resultsPage.style.display = 'none';
});