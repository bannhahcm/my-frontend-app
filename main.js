// =================================================================
// ============== LOGIC CHÍNH CỦA TRANG ============================
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

  // --- PHẦN 1: KHAI BÁO BIẾN & CÀI ĐẶT ---
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  console.log("API đang kết nối tới:", API_URL);
  // Biến để lưu trữ HTML gốc của menu sau khi được tạo
  let builtMenuHTML = '';
  let fullResultSet = [];
  let typeNameMappings = new Map();
  let initialMenuData = {};
  let currentFilters = {
    type: 'all',
    location: '',
    priceRange: '',
    itemSubType: '',
    sort: 'relevance'
  };
  const ITEMS_PER_PAGE = 5; // SỐ KẾT QUẢ TRÊN MỖI TRANG
  let currentPage = 1;

  const headerSearchButton = document.getElementById('header-search-button');
  const searchPopup = document.getElementById('search-popup');
  const closePopupButton = document.getElementById('close-popup-button');
  const searchForm = document.getElementById('search-form');
  const popupSearchInput = document.getElementById('popup-search-input');
  const suggestionsContainer = document.getElementById('search-suggestions-container');
  const resultsPage = document.getElementById('search-results-page');
  const hamburgerButton = document.getElementById('hamburger-button');
  const mainNav = document.getElementById('main-nav');
  const mainMenuList = document.getElementById('main-menu-list');

  function debounce(func, delay = 350) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

  // --- PHẦN 2: LOGIC XỬ LÝ MENU ĐỘNG ---
  function handleMenuInteractions() {

    //buildMainMenu(initialMenuData);
    mainNav.appendChild(mainMenuList); // Gắn lại <ul> vào <nav>
    const menuOverlay = document.getElementById('menu-overlay');
    if (!mainNav || !mainMenuList || !hamburgerButton || !menuOverlay) return;

    // Sử dụng if/else để đảm bảo chỉ một khối code được thực thi.
    if (window.innerWidth > 1024) {
      // --- LOGIC HOVER CHO DESKTOP ---
      let leaveTimeout;
      document.querySelectorAll('.main-nav > ul > li.has-submenu').forEach(item => {
        const subMenu = item.querySelector('.simple-menu, .mega-menu');
        if (!subMenu) return;

        item.addEventListener('mouseenter', () => {
          clearTimeout(leaveTimeout);
          document.querySelectorAll('.main-nav .is-active').forEach(active => active.classList.remove('is-active'));
          subMenu.classList.add('is-active');
        });

        item.addEventListener('mouseleave', () => {
          leaveTimeout = setTimeout(() => subMenu.classList.remove('is-active'), 200);
        });

        subMenu.addEventListener('mouseenter', () => clearTimeout(leaveTimeout));
        subMenu.addEventListener('mouseleave', () => {
          leaveTimeout = setTimeout(() => subMenu.classList.remove('is-active'), 200);
        });
      });
    } else {
      // --- LOGIC MENU DRILL-DOWN CHO MOBILE ---
      const slider = document.createElement('div');
      slider.className = 'menu-slider';
      const initialPanel = document.createElement('div');
      initialPanel.className = 'menu-panel';
      initialPanel.dataset.level = 0;
      initialPanel.innerHTML = `<div class="panel-header"><h4 class="panel-title">Menu</h4></div>`;
      const initialList = document.createElement('ul');
      initialList.className = 'panel-list';
      initialList.innerHTML = mainMenuList.innerHTML;
      initialPanel.appendChild(initialList);
      slider.appendChild(initialPanel);

   
      mainNav.appendChild(slider); // và thay bằng slider

      function openMobileMenu() {
        mainNav.classList.add('is-open');
        menuOverlay.classList.add('is-visible');
        document.body.style.overflow = 'hidden';
      }

      function closeMobileMenu() {
        mainNav.classList.remove('is-open');
        menuOverlay.classList.remove('is-visible');
        document.body.style.overflow = '';
        setTimeout(() => {
          slider.style.transition = 'none';
          const panels = slider.querySelectorAll('.menu-panel');
          for (let i = 1; i < panels.length; i++) {
            panels[i].remove();
          }
          slider.style.width = `100%`;
          slider.style.transform = `translateX(0%)`;
          setTimeout(() => slider.style.transition = '', 50);
        }, 350);
      }

      hamburgerButton.addEventListener('click', () => mainNav.classList.contains('is-open') ? closeMobileMenu() : openMobileMenu());
      menuOverlay.addEventListener('click', closeMobileMenu);
      
      // FIX 2: SỬA LẠI LOGIC NÚT BACK VÀ CÁC NÚT KHÁC
      slider.addEventListener('click', async (event) => {
        const targetLink = event.target.closest('a');
        if (!targetLink) return;

        // Xử lý cho nút Quay lại
        if (targetLink.classList.contains('panel-back-button')) {
          event.preventDefault();
          const currentPanel = targetLink.closest('.menu-panel');
          if (!currentPanel) return;
          const currentLevel = parseInt(currentPanel.dataset.level);
          if (currentLevel > 0) {
              const previousLevel = currentLevel - 1;
              slider.style.transform = `translateX(-${previousLevel * 100}%)`;
              setTimeout(() => {
                  currentPanel.remove();
                  const newPanelCount = slider.querySelectorAll('.menu-panel').length;
                  slider.style.width = `${newPanelCount * 100}%`;
              }, 350);
          }
          return;
        }

        const parentLi = targetLink.closest('li');
        if (!parentLi) return;
        
        // Nếu mục được bấm là cấp cuối cùng (không có menu con) -> chuyển trang
        if (!parentLi.classList.contains('has-submenu')) {
          event.preventDefault();
          closeMobileMenu();
          setTimeout(() => { window.location.href = targetLink.href; }, 400);
          return;
        }

        // Xử lý tạo panel mới khi đi tới
        event.preventDefault();
        const currentPanel = targetLink.closest('.menu-panel');
        const currentLevel = parseInt(currentPanel.dataset.level);
        const newPanel = document.createElement('div');
        newPanel.className = 'menu-panel';
        newPanel.dataset.level = currentLevel + 1;
        const title = targetLink.textContent.trim();
        newPanel.innerHTML = `
            <div class="panel-header">
                <a href="#" class="panel-back-button" aria-label="Quay lại"><svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path></svg></a>
                <h4 class="panel-title">${title}</h4>
            </div>
            <ul class="panel-list"><div class="spinner"></div></ul>
        `;
        slider.appendChild(newPanel);
        slider.style.width = `${(currentLevel + 2) * 100}%`;
        slider.style.transform = `translateX(-${(currentLevel + 1) * 100}%)`;

        const newList = newPanel.querySelector('.panel-list');

        if (currentLevel === 0) {
            const allLevel1Items = currentPanel.querySelectorAll('li');
            allLevel1Items.forEach(item => item.classList.remove('is-active'));
            parentLi.classList.add('is-active');

            const menuType = parentLi.dataset.menuType;
            let items = [];
            switch (menuType) {
                case 'project': items = initialMenuData.duAn.types; break;
                case 'sale': items = initialMenuData.muaBan.types; break;
                case 'rent': items = initialMenuData.choThue.types; break;
                case 'wiki': items = initialMenuData.wiki.topics; break;
                case 'news': items = initialMenuData.tinTuc.categories; break;
                case 'business': items = initialMenuData.doanhNghiep.types; break;
                default: break;
            }
            newList.innerHTML = items.map(item => `<li class="has-submenu" data-slug="${item.slug}"><a href="#">${item.name}</a></li>`).join('');
        }

        if (currentLevel === 1) {
            const grandParentLi = slider.querySelector('.menu-panel[data-level="0"] li.is-active');
            if (!grandParentLi) {
                console.error("Không tìm thấy mục cha (Cấp 1) đang active.");
                newList.innerHTML = '<li><a>Lỗi hệ thống.</a></li>';
                return;
            }
            const menuType = grandParentLi.dataset.menuType;
            const pageSlug = grandParentLi.dataset.pageSlug;
            const typeSlug = parentLi.dataset.slug;

            try {
                const response = await fetch(`${API_URL}/api/menu/dynamic-data?type=${menuType}&slug=${typeSlug}`);
                if (!response.ok) throw new Error('Lỗi tải dữ liệu khu vực');
                const data = await response.json();
                if (data.locations && data.locations.length > 0) {
                    newList.innerHTML = data.locations.map(loc => {
                        const finalUrl = `/${pageSlug}/${typeSlug}-${loc.slug}`;
                        return `<li><a href="${finalUrl}">${loc.name}</a></li>`;
                    }).join('');
                } else {
                    newList.innerHTML = '<li><a>Không có khu vực phù hợp.</a></li>';
                }
            } catch (error) {
                console.error("Lỗi tải khu vực cho menu mobile:", error);
                newList.innerHTML = '<li><a>Lỗi tải dữ liệu.</a></li>';
            }
        }
      });
    }
  }

  // Hàm chính để tạo menu
  function buildMainMenu(data) {
    if (!mainMenuList) return;
    mainMenuList.innerHTML = '';
    if (data.duAn?.types) mainMenuList.appendChild(createMegaMenuLi('Dự án', 'du-an', data.duAn.types, 'project'));
    if (data.muaBan?.types) mainMenuList.appendChild(createMegaMenuLi('Mua bán', 'ban', data.muaBan.types, 'sale'));
    if (data.choThue?.types) mainMenuList.appendChild(createMegaMenuLi('Cho thuê', 'cho-thue', data.choThue.types, 'rent'));
    if (data.wiki?.topics) mainMenuList.appendChild(createSimpleMenuLi('Wiki', 'wiki', data.wiki.topics, 'wiki'));
    if (data.tinTuc?.categories) mainMenuList.appendChild(createSimpleMenuLi('Tin tức', 'tin-tuc', data.tinTuc.categories, 'news'));
    if (data.doanhNghiep?.types) mainMenuList.appendChild(createSimpleMenuLi('Doanh nghiệp', 'doanh-nghiep', data.doanhNghiep.types, 'business'));
  }
  
  
      // Hàm tạo Mega Menu (Dự án, Mua bán, Cho thuê)
  function createMegaMenuLi(name, pageSlug, types, menuType) {
    const li = document.createElement('li');
    li.className = 'has-submenu';
    li.dataset.menuType = menuType;
    li.dataset.pageSlug = pageSlug;
    li.innerHTML = `<a href="/${pageSlug}">${name}</a>`; 

    const megaMenuDiv = document.createElement('div');
    megaMenuDiv.className = 'mega-menu';
    megaMenuDiv.innerHTML = `
      <div class="mega-menu-content">
        <div class="mega-menu-column col-1">
          <h4>${menuType === 'project' ? 'Loại hình dự án' : 'Loại hình BĐS'}</h4>
          <ul class="col-1-list"></ul>
        </div>
        <div class="mega-menu-column col-2">
          <h4>Khu vực nổi bật</h4>
          <ul class="col-2-list"><li><div class="spinner"></div></li></ul>
        </div>
        <div class="mega-menu-column col-3 featured-column">
          <h4>Dự án nổi bật</h4>
          <div class="col-3-content"><div class="spinner"></div></div>
        </div>
      </div>
    `;
    li.appendChild(megaMenuDiv);

    const col1List = megaMenuDiv.querySelector('.col-1-list');
    
      types.forEach((type, index) => {
      const typeLi = document.createElement('li');
      const typeA = document.createElement('a');
      typeA.href = '#';
      typeA.textContent = type.name;
      typeA.dataset.slug = type.slug; // Quan trọng: lưu slug vào data attribute
      if (index === 0) {
        typeA.classList.add('active'); // Đặt mục đầu tiên là active mặc định
      }
      typeLi.appendChild(typeA);
      col1List.appendChild(typeLi);
    });
    const debouncedUpdate = debounce((slug) => {
        updateDynamicColumns(megaMenuDiv, menuType, slug, pageSlug);
    }, 250);
    col1List.addEventListener('mouseover', (e) => {
        // Chỉ hoạt động nếu mục được rê chuột là một thẻ <a>
        if (e.target.tagName === 'A') {
            const currentSlug = e.target.dataset.slug;

            // Bỏ active của mục cũ và thêm active cho mục hiện tại
            const currentActive = col1List.querySelector('.active');
            if (currentActive) {
                currentActive.classList.remove('active');
            }
            e.target.classList.add('active');
            
            // Gọi hàm debounced để cập nhật Cột 2 và 3
            debouncedUpdate(currentSlug);
        }
    });
    if (types.length > 0) {
      updateDynamicColumns(megaMenuDiv, menuType, types[0].slug, pageSlug);
    }

    return li;
  }
  
// Hàm tạo menu đơn giản
  function createSimpleMenuLi(name, pageSlug, items, menuType) {
      const li = document.createElement('li');
      li.className = 'has-submenu';
      li.dataset.menuType = menuType; // << Gán menuType vào dataset
      li.dataset.pageSlug = pageSlug; // << Thêm pageSlug để đồng bộ với mega menu
  
      li.innerHTML = `<a href="/${pageSlug}">${name}</a>`; 
      const simpleMenuDiv = document.createElement('div');
      simpleMenuDiv.className = 'simple-menu';
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'simple-menu-content';
      const ul = document.createElement('ul');
      items.forEach(item => {
        ul.innerHTML += `<li><a href="/${pageSlug}/${item.slug}">${item.name}</a></li>`;
      });

      contentWrapper.appendChild(ul);
      simpleMenuDiv.appendChild(contentWrapper);
      li.appendChild(simpleMenuDiv);
      return li;
  }
    // Hàm gọi API và cập nhật Cột 2, Cột 3
  async function updateDynamicColumns(megaMenuDiv, menuType, slug, pageSlug) {
    const col2List = megaMenuDiv.querySelector('.col-2-list');
    const col3Content = megaMenuDiv.querySelector('.col-3-content');
    
    col2List.innerHTML = '<li><div class="spinner"></div></li>';
    col3Content.innerHTML = '<div class="spinner"></div>';
    
    try {
      const response = await fetch(`${API_URL}/api/menu/dynamic-data?type=${menuType}&slug=${slug}`);
      if (!response.ok) throw new Error('Failed to fetch dynamic data');
      const data = await response.json();
      
      col2List.innerHTML = '';
      if (data.locations.length > 0) {
        data.locations.forEach(loc => col2List.innerHTML += `<li><a href="/${pageSlug}/${slug}-${loc.slug}">${loc.name}</a></li>`);
      } else {
        col2List.innerHTML = '<li>Chưa có địa điểm.</li>';
      }

      col3Content.innerHTML = '';
      if (data.featured.project) {
        const p = data.featured.project;
        col3Content.innerHTML = `
          <a href="/du-an/${p.cached_project_type_slug}-${p.cached_location_slug}/${p.slug}" class="featured-card">
            <img src="${p.image_url || 'https://via.placeholder.com/300x200'}" alt="${p.name}">
            <div class="featured-card-content">
              <h5>${p.name}</h5>
              <p>${p.description ? p.description.substring(0, 50) + '...' : ''}</p>
            </div>
          </a>
        `;
      } else {
         col3Content.innerHTML = '<p>Chưa có nội dung nổi bật.</p>';
      }
    } catch (error) {
      console.error("Could not update dynamic columns:", error);
      col2List.innerHTML = '<li>Lỗi tải dữ liệu.</li>';
      col3Content.innerHTML = '<p>Lỗi tải dữ liệu.</p>';
    }
  }

  // --- PHẦN 3: LOGIC TÌM KIẾM ---
      // === PHẦN MỚI: LOGIC CHO LỊCH SỬ & TÌM KIẾM PHỔ BIẾN ===

  // --- Các hàm quản lý Lịch sử tìm kiếm (dùng localStorage) ---
  const getSearchHistory = () => {
    try {
      return JSON.parse(localStorage.getItem('bds_search_history')) || [];
    } catch (e) {
      return [];
    }
  };
  const addSearchToHistory = (term) => {
    if (!term) return;
    let history = getSearchHistory();
    // Xóa đi nếu đã có để đưa lên đầu
    history = history.filter(item => item !== term);
    // Thêm vào đầu danh sách
    history.unshift(term);
    // Giới hạn 5 mục
    history.splice(5); 
    localStorage.setItem('bds_search_history', JSON.stringify(history));
  };
  function renderSearchHistory() {
    const container = document.getElementById('history-suggestions');
    if (!container) return;
    const history = getSearchHistory();
    if (history.length === 0) {
      container.innerHTML = '';
      return;
    }
    const tagsHTML = history.map(term => `<div class="suggestion-tag">${term}</div>`).join('');
    container.innerHTML = `
      <h4 class="suggestions-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        Lịch sử tìm kiếm
      </h4>
      <div class="suggestions-tags">${tagsHTML}</div>
    `;
  }
  async function renderPopularSearches() {
    const container = document.getElementById('popular-suggestions');
    if (!container) return;
    try {
      const response = await fetch(`${API_URL}/api/popular-searches`);
      const popular = await response.json();
      if(popular.length === 0) return;

      const tagsHTML = popular.map(term => `<div class="suggestion-tag">${term}</div>`).join('');
      container.innerHTML = `
        <h4 class="suggestions-title">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
           Tìm kiếm phổ biến
        </h4>
        <div class="suggestions-tags">${tagsHTML}</div>
      `;
    } catch (error) {
      console.error("Lỗi tải tìm kiếm phổ biến:", error);
      container.innerHTML = ''; // Ẩn đi nếu có lỗi
    }
  }
  // --- PHẦN 3: LOGIC CHO TÌM KIẾM VÀ TRANG KẾT QUẢ ---

  function showPopup() {
    searchPopup.style.display = 'flex';
    popupSearchInput.focus();
    renderSearchHistory(); // Render lịch sử
    renderPopularSearches(); // Render tìm kiếm phổ biến
  }
  function hidePopup() {
    searchPopup.style.display = 'none';
  }
  // Hàm gọi API để lấy kết quả tìm kiếm thật
  async function fetchSearchResults(query) {
    if (!query) return [];
    try {
      const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Lỗi mạng hoặc server API không phản hồi.');
      return await response.json();
    } catch (error) {
      console.error('Lỗi khi gọi API tìm kiếm:', error);
      return [];
    }
  }
    // Hàm hiển thị gợi ý autocomplete
   async function renderAutocomplete(query) {
    if (!suggestionsContainer) return;

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

    // Chỉ hiển thị 5 gợi ý đầu tiên
    results.slice(0, 5).forEach(item => {
      const itemEl = document.createElement('li');
      itemEl.className = 'suggestion-item';
      itemEl.textContent = item.title;
      itemEl.addEventListener('click', () => {
        if (popupSearchInput) popupSearchInput.value = item.title;
        if (searchForm) searchForm.requestSubmit();
      });
      listEl.appendChild(itemEl);
    });

    groupEl.appendChild(listEl);
    suggestionsContainer.appendChild(groupEl);
  }
     // Hàm chính được gọi sau khi có kết quả từ API
  function setupResultsPage(query, hits) {
    fullResultSet = hits;
    currentPage = 1;
    currentFilters = { type: 'all', sort: 'relevance', query: query };

    // 1. Tạo bộ khung HTML cho trang kết quả
    resultsPage.innerHTML = `
      <div class="results-header">
        <h1>Kết quả tìm kiếm cho: "<span id="search-term-display"></span>"</h1>
        <p><span id="results-count-display"></span> kết quả được tìm thấy.</p>
      </div>
      <div class="results-top-bar">
        <div id="result-tabs-container" class="result-tabs"></div>
        <div class="sort-container">
          <select id="sort-by"><option value="relevance">Liên quan nhất</option><option value="newest">Mới nhất</option></select>
        </div>
      </div>
      <div id="result-filters-container" class="result-filters"></div>
      <div id="no-results-message" class="no-results-message" style="display: none;">
        <p>Rất tiếc, không tìm thấy kết quả nào phù hợp.</p>
        <p>Hãy thử với từ khóa khác hoặc duyệt qua các danh mục của chúng tôi.</p>
      </div>
      <div id="results-list-container" class="results-list"></div>
      <div id="pagination-container" class="pagination-container"></div>
    `;
    resultsPage.style.display = 'block';

    // 2. Điền thông tin ban đầu
    document.getElementById('search-term-display').textContent = query;
    //document.getElementById('results-count-display').textContent = hits.length;

    // 3. Tạo các Tabs phân loại động
    updateAndRenderTabs();

    // 4. Hiển thị bộ lọc chi tiết
    updateAndRenderDetailFilters();

    // 5. Hiển thị danh sách kết quả ban đầu
    renderFilteredResults();

    // 6. Gắn các sự kiện cho bộ lọc và sắp xếp
    attachFilterListeners();
    attachPaginationListeners();
  }
  

  // Hiển thị bộ lọc chi tiết tùy theo tab đang active
  function updateAndRenderDetailFilters() {
    const filtersContainer = document.getElementById('result-filters-container');
    if (!filtersContainer) return;

    const activeType = currentFilters.type;
    let relevantHits = fullResultSet;
    if (activeType !== 'all') {
        relevantHits = fullResultSet.filter(h => h.searchable_type === activeType);
    }
    
    let filtersHTML = '';
    
    // Hàm trợ giúp để lấy tên từ slug, nếu không có thì trả về slug đã được viết hoa
    const getName = (slug) => typeNameMappings.get(slug) || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // --- LỌC CHO DỰ ÁN / MUA BÁN / CHO THUÊ ---
    if (['PROJECT', 'PRODUCT_SALE', 'PRODUCT_RENT'].includes(activeType)) {
      let priceRanges = {};

        // Nếu là tab "Cho thuê", dùng đơn vị "triệu"
        if (activeType === 'PRODUCT_RENT') {
            priceRanges = { 
                "": "Tất cả mức giá", 
                "0-5": "Dưới 5 triệu", 
                "5-10": "Từ 5 - 10 triệu", 
                "10-20": "Từ 10 - 20 triệu",
                "20-50": "Từ 20 - 50 triệu",
                "50-": "Trên 50 triệu"
            };
        } else {
        // Ngược lại (Dự án, Mua bán), dùng đơn vị "tỷ"
            priceRanges = { 
                "": "Tất cả mức giá", 
                "0-2": "Dưới 2 tỷ", 
                "2-5": "Từ 2 - 5 tỷ", 
                "5-10": "Từ 5 - 10 tỷ", 
                "10-": "Trên 10 tỷ"
            };
        }
        const locations = [...new Set(relevantHits.map(h => h.address_detail.split(',').pop().trim()))].filter(Boolean);
        let locationOptions = '<option value="">Tất cả khu vực</option>' + locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');

        let priceOptions = Object.entries(priceRanges).map(([key, value]) => `<option value="${key}">${value}</option>`).join('');

        const itemSubTypes = [...new Set(relevantHits.map(h => h.sub_type_slug))].filter(Boolean);
        let subTypeOptions = '<option value="">Tất cả loại hình</option>' + itemSubTypes.map(slug => `<option value="${slug}">${getName(slug)}</option>`).join('');
        
        filtersHTML = `
            <select id="location-filter">${locationOptions}</select>
            <select id="price-filter">${priceOptions}</select>
            <select id="item-subtype-filter">${subTypeOptions}</select>
        `;
    } 
    // --- LỌC CHO WIKI / TIN TỨC ---
    else if (['WIKI_ARTICLE', 'NEWS_ARTICLE'].includes(activeType)) {
        const categories = [...new Set(relevantHits.map(h => h.sub_type_slug))].filter(Boolean);
        let categoryOptions = '<option value="">Tất cả chuyên mục</option>' + categories.map(slug => `<option value="${slug}">${getName(slug)}</option>`).join('');
        
        filtersHTML = `<select id="item-subtype-filter">${categoryOptions}</select>`;
    }
    // --- LỌC CHO DOANH NGHIỆP ---
    else if (activeType === 'BUSINESS_PROFILE') {
        const businessTypes = [...new Set(relevantHits.map(h => h.sub_type_slug))].filter(Boolean);
        let bizTypeOptions = '<option value="">Tất cả loại hình</option>' + businessTypes.map(slug => `<option value="${slug}">${getName(slug)}</option>`).join('');

        filtersHTML = `<select id="item-subtype-filter">${bizTypeOptions}</select>`;
    }

    filtersContainer.innerHTML = filtersHTML;
    filtersContainer.style.display = filtersHTML ? 'flex' : 'none';
}

  // Tạo và cập nhật các Tabs
  function updateAndRenderTabs() {
    const tabsContainer = document.getElementById('result-tabs-container');
    if (!tabsContainer) return;
    const counts = {
  all: fullResultSet.length,
  PROJECT: fullResultSet.filter(h => h.searchable_type === 'PROJECT').length,
  // Sửa lại cho đúng searchable_type
  PRODUCT_SALE: fullResultSet.filter(h => h.searchable_type === 'PRODUCT_SALE').length,
  PRODUCT_RENT: fullResultSet.filter(h => h.searchable_type === 'PRODUCT_RENT').length,
  NEWS_ARTICLE: fullResultSet.filter(h => h.searchable_type === 'NEWS_ARTICLE').length,
  WIKI_ARTICLE: fullResultSet.filter(h => h.searchable_type === 'WIKI_ARTICLE').length,
  BUSINESS_PROFILE: fullResultSet.filter(h => h.searchable_type === 'BUSINESS_PROFILE').length
};
    let tabsHTML = `<button class="tab-button active" data-type="all">Tất cả <span>(${counts.all})</span></button>`;
    if (counts.PROJECT > 0) tabsHTML += `<button class="tab-button" data-type="PROJECT">Dự án <span>(${counts.PROJECT})</span></button>`;
    if (counts.PRODUCT_SALE > 0) tabsHTML += `<button class="tab-button" data-type="PRODUCT_SALE">Mua bán <span>(${counts.PRODUCT_SALE})</span></button>`;
    if (counts.PRODUCT_RENT > 0) tabsHTML += `<button class="tab-button" data-type="PRODUCT_RENT">Cho thuê <span>(${counts.PRODUCT_RENT})</span></button>`;
    if (counts.NEWS_ARTICLE > 0) tabsHTML += `<button class="tab-button" data-type="NEWS_ARTICLE">Tin tức <span>(${counts.NEWS_ARTICLE})</span></button>`;
    if (counts.WIKI_ARTICLE > 0) tabsHTML += `<button class="tab-button" data-type="WIKI_ARTICLE">Wiki <span>(${counts.WIKI_ARTICLE})</span></button>`;
    if (counts.BUSINESS_PROFILE > 0) tabsHTML += `<button class="tab-button" data-type="BUSINESS_PROFILE">Doanh nghiệp <span>(${counts.BUSINESS_PROFILE})</span></button>`;
    tabsContainer.innerHTML = tabsHTML;
  }
    // Hàm chính để lọc, sắp xếp và hiển thị kết quả
  function renderFilteredResults() {
    const listContainer = document.getElementById('results-list-container');
    const noResultsMessage = document.getElementById('no-results-message');
    if (!listContainer || !noResultsMessage) return;

    let filtered = [...fullResultSet];
    if (currentFilters.type !== 'all') {
      filtered = filtered.filter(h => h.searchable_type === currentFilters.type);
    }
    // === LỌC CHI TIẾT (PHẦN MỚI) ===
    if (currentFilters.location) {
        filtered = filtered.filter(h => h.address_detail && h.address_detail.includes(currentFilters.location));
    }
    if (currentFilters.itemSubType) {
        filtered = filtered.filter(h => h.sub_type_slug === currentFilters.itemSubType);
    }
    if (currentFilters.priceRange) {
        const [min, max] = currentFilters.priceRange.split('-').map(Number);
        filtered = filtered.filter(h => {
            const price = h.price_from || 0;
            if (!max) return price >= min; // VD: "10-"
            return price >= min && price < max; // VD: "2-5"
        });
    }
    if (currentFilters.sort === 'newest') {
      filtered.sort((a, b) => new Date(b.published_date || 0) - new Date(a.published_date || 0));
    }
    // === LOGIC MỚI CỦA PHÂN TRANG ===
    document.getElementById('results-count-display').textContent = filtered.length;
    listContainer.innerHTML = '';
    
    if (filtered.length === 0) {
      noResultsMessage.style.display = 'block';
      renderPagination(0, 0); // Ẩn phân trang nếu không có kết quả
    } else {
      noResultsMessage.style.display = 'none';

      // Tính toán vị trí bắt đầu và kết thúc để cắt mảng kết quả
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedItems = filtered.slice(startIndex, endIndex);

      // Chỉ render các item của trang hiện tại
      paginatedItems.forEach(hit => listContainer.appendChild(createResultItem(hit)));
      
      // Render các nút điều khiển phân trang
      const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
      renderPagination(totalPages, currentPage);
    }
   
  }
  function renderPagination(totalPages, page) {
      const container = document.getElementById('pagination-container');
      if (!container || totalPages <= 1) {
          if(container) container.innerHTML = '';
          return;
      }

      let paginationHTML = '<ul class="pagination-list">';
      
      // Nút "Trang trước"
      paginationHTML += `<li class="page-item ${page === 1 ? 'disabled' : ''}">
          <a href="#" class="page-link" data-page="${page - 1}">‹</a>
      </li>`;

      // Logic hiển thị các số trang (có dấu "...")
      for (let i = 1; i <= totalPages; i++) {
          if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
              paginationHTML += `<li class="page-item ${i === page ? 'active' : ''}">
                  <a href="#" class="page-link" data-page="${i}">${i}</a>
              </li>`;
          } else if (i === page - 2 || i === page + 2) {
              paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
          }
      }

      // Nút "Trang sau"
      paginationHTML += `<li class="page-item ${page === totalPages ? 'disabled' : ''}">
          <a href="#" class="page-link" data-page="${page + 1}">›</a>
      </li>`;

      paginationHTML += '</ul>';
      container.innerHTML = paginationHTML;
      
  }
  function attachPaginationListeners() {
      const paginationContainer = document.getElementById('pagination-container');
      if (!paginationContainer) return;

      paginationContainer.addEventListener('click', (e) => {
          e.preventDefault();
          const target = e.target.closest('.page-link');

          if (!target || target.closest('.disabled') || target.closest('.active')) {
              return;
          }

          const newPage = parseInt(target.dataset.page);
          if (newPage && newPage !== currentPage) {
              currentPage = newPage;
              renderFilteredResults(); // Render lại kết quả cho trang mới
              // Cuộn lên đầu danh sách kết quả
              document.getElementById('results-list-container').scrollIntoView({ behavior: 'smooth' });
          }
           // === PHẦN THÊM MỚI ĐỂ CUỘN LÊN ĐẦU ===
            const tabsContainer = document.getElementById('result-tabs-container');
            if (tabsContainer) {
                tabsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
      });
  }
  // CẬP NHẬT LẠI HÀM NÀY
  function attachFilterListeners() {
    const resultsContainer = document.getElementById('search-results-page');
    if (!resultsContainer) return;
    resultsPage.addEventListener('click', (e) => {
      if (e.target.closest('.tab-button')) {
        currentPage = 1; // << THÊM DÒNG NÀY
        resultsContainer.querySelector('.tab-button.active')?.classList.remove('active');
        const button = e.target.closest('.tab-button');
        button.classList.add('active');
        currentFilters.type = button.dataset.type;
        currentFilters.location = '';
        currentFilters.priceRange = '';
        currentFilters.itemSubType = '';
        updateAndRenderDetailFilters();
        renderFilteredResults();
      }
    });
    const sortByEl = document.getElementById('sort-by');
    if (sortByEl) {
      sortByEl.addEventListener('change', (e) => {
        currentPage = 1; // << THÊM DÒNG NÀY
        currentFilters.sort = e.target.value;
        renderFilteredResults();
      });
    }
    const filtersContainer = document.getElementById('result-filters-container');
    if(filtersContainer) {
        filtersContainer.addEventListener('change', (e) => {
            if (e.target.tagName !== 'SELECT') return;
            currentPage = 1; // << THÊM DÒNG NÀY
            const filterId = e.target.id;
            const value = e.target.value;

            if (filterId === 'location-filter') currentFilters.location = value;
            if (filterId === 'price-filter') currentFilters.priceRange = value;
            if (filterId === 'item-subtype-filter') currentFilters.itemSubType = value;

            renderFilteredResults();
        });
    }
  }

  // Tạo một item kết quả
 function createResultItem(hit) {
    const item = document.createElement('div');
    item.className = 'result-item';

    // 1. Logic tạo badge (Giữ nguyên, đã đúng)
    let badgeText = '', badgeClass = hit.searchable_type || 'default';
    switch (hit.searchable_type) {
        case 'PROJECT': badgeText = 'Dự án'; break;
        case 'PRODUCT_SALE': // Xử lý riêng cho sản phẩm bán
        badgeText = 'Mua bán';
        break;
        case 'PRODUCT_RENT': // Xử lý riêng cho sản phẩm cho thuê
        badgeText = 'Cho thuê';
        break;
        case 'NEWS_ARTICLE': badgeText = 'Tin tức'; break;
        case 'WIKI_ARTICLE': badgeText = 'Wiki'; break;
        case 'BUSINESS_PROFILE': badgeText = 'Doanh nghiệp'; break;
        default: badgeText = 'Khác';
    }
    
    // 2. Chuẩn bị dữ liệu hiển thị (Đã cập nhật)
    const imageUrl = hit.image_url || `https://via.placeholder.com/220x170/EFEFEF/808080?text=No+Image`;
    
    // Format ngày: dd/mm/yyyy
    const lastUpdated = hit.published_date 
        ? new Date(hit.published_date).toLocaleDateString('vi-VN') 
        : '';
    
    // Format giá: xử lý cả giá chính xác (price) và khoảng giá (price_from)
    let priceText = '';
    const priceFrom = hit.price_from;
    const priceTo = hit.price_to;
    const priceUnit = hit.price_unit || '';
    const formatter = new Intl.NumberFormat('vi-VN');

    if (priceFrom && priceTo) {
        // Trường hợp có cả giá từ và giá đến (dành cho Project)
        priceText = `Từ ${formatter.format(priceFrom)} - ${formatter.format(priceTo)} ${priceUnit}`;
    } else if (priceFrom) {
        // Trường hợp chỉ có giá từ (dành cho Project) hoặc giá chính xác (dành cho Product)
        priceText = ` ${formatter.format(priceFrom)} ${priceUnit}`;
    } else if (priceTo) {
        // Trường hợp hiếm gặp: chỉ có giá đến
        priceText = ` ${formatter.format(priceTo)} ${priceUnit}`;
    }
        
    // Format địa chỉ
    const addressText = hit.address_detail || '';

    // 3. Cấu trúc HTML mới theo đúng thứ tự bạn yêu cầu
    item.innerHTML = `
      <div class="item-thumbnail">
        <a href="${hit.url || '#'}"><img src="${imageUrl}" alt="${hit.title || ''}"></a>
      </div>
      <div class="item-content">
        <span class="item-badge badge-${badgeClass}">${badgeText}</span>
        
        <div class="item-header">
          <h2><a href="${hit.url || '#'}">${hit.title || ''}</a></h2>
        </div>
        
        <p class="item-description">${hit.description || ''}</p>
        <div class="item-address">${addressText}</div>
        <div class="item-price">${priceText}</div>
        <div class="item-date">${lastUpdated ? 'Cập nhật: ' + lastUpdated : ''}</div>
      </div>`;
      
    return item;
}

  // --- PHẦN 4: KHỞI TẠO VÀ GẮN SỰ KIỆN ---
  async function initializeApp() {
    try {
      const response = await fetch(`${API_URL}/api/menu/initial-data`);
      if (!response.ok) throw new Error('Lỗi khi tải dữ liệu menu ban đầu');
      initialMenuData = await response.json();

      typeNameMappings.clear();
      const populateMap = (items) => {
        if (items) items.forEach(item => typeNameMappings.set(item.slug, item.name));
      };
      populateMap(initialMenuData.duAn?.types);
      populateMap(initialMenuData.muaBan?.types);
      populateMap(initialMenuData.wiki?.topics);
      populateMap(initialMenuData.tinTuc?.categories);
      populateMap(initialMenuData.doanhNghiep?.types);

      buildMainMenu(initialMenuData);
      builtMenuHTML = mainMenuList.innerHTML;
      await buildMainMenu(initialMenuData);
      handleMenuInteractions();
    } catch (error) {
      console.error("Không thể khởi tạo ứng dụng:", error);
      if (mainMenuList) mainMenuList.innerHTML = '<li><a href="#">Lỗi tải menu</a></li>';
    }
  }

  if (headerSearchButton) headerSearchButton.addEventListener('click', showPopup);
  if (closePopupButton) closePopupButton.addEventListener('click', hidePopup);
  /* if (searchPopup) searchPopup.addEventListener('click', (event) => { if (event.target === searchPopup) hidePopup(); }); */
  
  if (popupSearchInput) {
    popupSearchInput.addEventListener('input', debounce(event => {
      const query = event.target.value;
      if (query.length < 2) {
        if (suggestionsContainer) suggestionsContainer.style.display = 'none';
        return;
      }
      renderAutocomplete(query);
    }));
    popupSearchInput.addEventListener('blur', () => { setTimeout(() => { if (suggestionsContainer) suggestionsContainer.style.display = 'none'; }, 200); });
  }
  
  if (searchForm) {
    searchForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const query = popupSearchInput.value.trim();
      if (query) {
        addSearchToHistory(query);
        hidePopup();
        const hits = await fetchSearchResults(query);
        setupResultsPage(query, hits);
      }
    });
  }
  

  const extraSuggestionsContainer = document.getElementById('search-extra-suggestions');
  if (extraSuggestionsContainer) {
    extraSuggestionsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('suggestion-tag')) {
        const term = e.target.textContent;
        popupSearchInput.value = term;
        searchForm.requestSubmit();
      }
    });
  }
  // THÊM ĐOẠN CODE HOÀN TOÀN MỚI NÀY VÀO FILE
window.addEventListener('resize', debounce(() => {
    console.log('Cửa sổ thay đổi kích thước, đang cài đặt lại menu...');

    // Dọn dẹp các sự kiện và cấu trúc cũ có thể còn sót lại
    // Bằng cách reset menu về trạng thái HTML gốc
    mainNav.innerHTML = ''; // Xóa sạch mọi thứ bên trong <nav>
    mainMenuList.innerHTML = builtMenuHTML; // Phục hồi lại cấu trúc <ul> gốc
    
    // Chạy lại logic cài đặt menu để nó nhận diện kích thước mới
    handleMenuInteractions();
}, 250));

  initializeApp();

});