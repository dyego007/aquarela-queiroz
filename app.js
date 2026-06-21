// Configuração do Catálogo
const CONFIG = {
    // Para usar o Behold.so (Integração Oficial do Instagram - Recomendado)
    // Crie uma conta gratuita em behold.so, conecte seu Instagram e cole a URL da API aqui.
    // Exemplo: "https://api.behold.so/v1/feeds/oHw...p"
    beholdUrl: "",

    // Para usar o Google Sheets (Planilha de Controle)
    // Exemplo: "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
    googleSheetUrl: "", 
    
    // Caminho para o arquivo JSON local (servindo de backup/demonstração)
    localJsonPath: "data/instagram_posts.json"
};

// Cart State
let cart = [];
let products = [];

// Helper: Parser simples de CSV que respeita aspas
function parseCSV(text) {
    const lines = text.split('\n');
    if (lines.length === 0) return [];
    
    // Extrai cabeçalhos
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    return lines.slice(1).filter(line => line.trim() !== '').map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' || char === "'") {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^["']|["']$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/^["']|["']$/g, ''));
        
        const obj = {};
        headers.forEach((header, index) => {
            let val = values[index] || '';
            if (header === 'sizes' || header === 'colors') {
                // Separa tamanhos/cores por ponto e vírgula
                obj[header] = val.split(';').map(s => s.trim()).filter(s => s !== '');
            } else if (header === 'price') {
                obj[header] = parseFloat(val.replace(',', '.')) || 0.0;
            } else {
                obj[header] = val;
            }
        });
        
        // Garante compatibilidade de chaves
        if (!obj.image_url && obj.image) obj.image_url = obj.image;
        if (!obj.instagram_url && obj.link) obj.instagram_url = obj.link;
        
        return obj;
    });
}

// Helper: Extract a clean title from the Instagram caption
function getCleanTitle(caption) {
    const firstLine = caption.split('\n')[0];
    // Remove emojis
    return firstLine.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
}

// Helper: Extract description lines (excluding title and price)
function getCleanDescription(caption) {
    const lines = caption.split('\n');
    if (lines.length <= 1) return "";
    return lines.slice(1)
        .filter(line => !line.includes('🏷️') && !line.includes('R$'))
        .join('<br>')
        .trim();
}

// Fetch posts and render them
async function loadCatalog() {
    const feedContainer = document.getElementById('product-feed');
    feedContainer.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-800 mb-4"></div>
            <p class="text-slate-500 font-medium">Carregando as últimas novidades...</p>
        </div>
    `;

    try {
        let items = [];
        
        if (CONFIG.beholdUrl) {
            // Sincronização direta com a API do Behold (oficial do Instagram)
            const response = await fetch(CONFIG.beholdUrl);
            if (!response.ok) throw new Error('Não foi possível carregar a API do Behold.');
            const beholdData = await response.json();
            // Suporta tanto array direto quanto objeto contendo a lista no campo 'posts'
            const postsArray = Array.isArray(beholdData) ? beholdData : (beholdData.posts || []);
            
            items = postsArray.map(post => {
                const caption = post.caption || post.prunedCaption || "Look Aquarela Queiroz";
                
                // Tenta extrair o preço (ex: R$ 189,90)
                let price = 150.0;
                const priceMatch = caption.match(/R\$\s*(\d+[\d.,]*)/i);
                if (priceMatch) {
                    try {
                        price = parseFloat(priceMatch[1].replace('.', '').replace(',', '.'));
                    } catch(e) {}
                }
                
                // Tenta extrair tamanhos (P, M, G, GG)
                let sizes = ["P", "M", "G"];
                const foundSizes = [];
                ["P", "M", "G", "GG"].forEach(s => {
                    const regex = new RegExp('\\b' + s + '\\b');
                    if (regex.test(caption)) foundSizes.push(s);
                });
                if (foundSizes.length > 0) sizes = foundSizes;
                
                // Tenta extrair cores (Cores: Menta, Areia, etc)
                let colors = ["Padrão"];
                const colorMatch = caption.match(/(?:cores|dispon[ií]vel em|dispon[ií]vel nas cores|cor)\s*:\s*([^\n]+)/i);
                if (colorMatch) {
                    const colorsList = colorMatch[1].split(/,|e|\/|;/).map(c => c.trim().replace(/[^\w\s-]/g, '').trim()).filter(c => c !== '');
                    if (colorsList.length > 0) colors = colorsList.slice(0, 4);
                }
                
                return {
                    id: post.id,
                    media_type: post.mediaType || ((post.videoUrl || post.video_url) ? "VIDEO" : "IMAGE"),
                    image_url: post.mediaUrl || post.media_url,
                    video_url: post.videoUrl || post.video_url || null,
                    instagram_url: post.permalink,
                    caption: caption,
                    price: price,
                    sizes: sizes,
                    colors: colors
                };
            });
        } else if (CONFIG.googleSheetUrl) {
            const response = await fetch(CONFIG.googleSheetUrl);
            if (!response.ok) throw new Error('Não foi possível carregar a planilha do Google.');
            const csvText = await response.text();
            items = parseCSV(csvText);
        } else {
            const response = await fetch(CONFIG.localJsonPath);
            if (!response.ok) throw new Error('Não foi possível carregar os posts.');
            items = await response.json();
        }
        
        products = items;
        
        products = items;
        
        // Filtra e exibe os produtos estáticos na vitrine
        filterProducts();
        
        // Renderiza os Reels
        const videoProducts = products.filter(p => p.media_type === "VIDEO");
        renderReels(videoProducts);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        feedContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-red-500 font-semibold mb-2">Ops! Ocorreu um erro ao carregar o feed.</p>
                <button onclick="loadCatalog()" class="px-4 py-2 bg-slate-800 text-white rounded-full text-sm font-medium hover:bg-slate-700 transition">Tentar novamente</button>
            </div>
        `;
    }
}

// Render product grid
function renderCatalog(items) {
    const feedContainer = document.getElementById('product-feed');
    feedContainer.innerHTML = '';

    if (items.length === 0) {
        feedContainer.innerHTML = `<p class="col-span-full text-center py-12 text-slate-500 text-sm font-medium">Nenhum look encontrado para esta busca.</p>`;
        return;
    }

    items.forEach(product => {
        const title = getCleanTitle(product.caption);
        const description = getCleanDescription(product.caption);
        
        // Promo badge and price layout
        const hasPromo = product.old_price && product.old_price > product.price;
        const badgeHTML = hasPromo ? `<span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-rose-600 text-[9px] font-bold text-white uppercase shadow-sm z-10">Promoção</span>` : '';
        const priceHTML = hasPromo 
            ? `<div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[10px] text-slate-400 line-through">R$ ${product.old_price.toFixed(2).replace('.', ',')}</span>
                    <span class="text-xs sm:text-sm font-bold text-rose-700 whitespace-nowrap">R$ ${product.price.toFixed(2).replace('.', ',')}</span>
                </div>`
            : `<span class="text-xs sm:text-sm font-bold text-rose-700 whitespace-nowrap">R$ ${product.price.toFixed(2).replace('.', ',')}</span>`;

        const card = document.createElement('div');
        card.className = 'glass rounded-2xl sm:rounded-3xl overflow-hidden hover-scale flex flex-col h-full cursor-pointer relative';
        
        // Click card opens details bottom sheet modal
        card.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            openProductModal(product);
        });
        
        card.innerHTML = `
            <!-- Imagem e Link Instagram -->
            <div class="relative aspect-square overflow-hidden group bg-slate-100">
                <img src="${product.image_url}" alt="${title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy">
                ${badgeHTML}
                <a href="${product.instagram_url}" target="_blank" class="absolute top-2 right-2 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full glass flex items-center justify-center text-rose-600 shadow-sm hover:scale-110 transition-transform z-10" title="Ver post no Instagram">
                    <i class="fab fa-instagram text-base sm:text-xl"></i>
                </a>
            </div>

            <!-- Detalhes do Produto -->
            <div class="p-3 sm:p-5 flex flex-col flex-grow">
                <div class="flex flex-col justify-between flex-grow mb-3 gap-1">
                    <h3 class="text-xs sm:text-sm font-bold tracking-tight text-slate-800 leading-snug line-clamp-2" title="${title}">${title}</h3>
                    ${priceHTML}
                </div>
                
                <!-- Botão de Ação -->
                <button class="w-full py-2 bg-slate-900 text-white rounded-xl text-[11px] sm:text-xs font-semibold tracking-wide hover:bg-rose-600 btn-glow-hover transition-colors duration-300 flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10">
                    <i class="fas fa-shopping-bag text-[9px]"></i> Ver opções
                </button>
            </div>
        `;
        feedContainer.appendChild(card);
    });
}

// Filter States
// Filter & Pagination States
let activeSizeFilter = 'ALL';
let activeSearchQuery = '';
const ITEMS_PER_PAGE = 6;
let currentPage = 1;
let filteredProducts = [];

// Filter Products Logic
function filterProducts() {
    filteredProducts = products.filter(product => {
        if (product.media_type === "VIDEO") return false;
        
        const matchesSize = activeSizeFilter === 'ALL' || product.sizes.includes(activeSizeFilter);
        
        const cleanCaption = product.caption.toLowerCase();
        const cleanTitle = getCleanTitle(product.caption).toLowerCase();
        const matchesSearch = cleanCaption.includes(activeSearchQuery) || cleanTitle.includes(activeSearchQuery);
        
        return matchesSize && matchesSearch;
    });
    
    currentPage = 1;
    renderCatalogPage(currentPage);
}

// Render specific catalog page
function renderCatalogPage(page) {
    currentPage = page;
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageItems = filteredProducts.slice(startIndex, endIndex);
    
    renderCatalog(pageItems);
    renderPaginationControls();
}

// Render pagination buttons
function renderPaginationControls() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    
    if (totalPages <= 1) {
        return; // No pagination needed
    }
    
    // Previous Page Button
    const prevBtn = document.createElement('button');
    prevBtn.className = `w-9 h-9 rounded-full flex items-center justify-center border text-sm font-semibold transition ${currentPage === 1 ? 'border-slate-100 text-slate-300 cursor-not-allowed' : 'border-slate-200 text-slate-700 hover:bg-slate-50 bg-white'}`;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left text-xs"></i>';
    if (currentPage > 1) {
        prevBtn.addEventListener('click', () => {
            renderCatalogPage(currentPage - 1);
            scrollToCatalog();
        });
    }
    paginationContainer.appendChild(prevBtn);
    
    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        const isActive = i === currentPage;
        pageBtn.className = `w-9 h-9 rounded-full flex items-center justify-center border text-xs font-bold transition ${isActive ? 'bg-slate-900 text-white border-slate-900 shadow' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            renderCatalogPage(i);
            scrollToCatalog();
        });
        paginationContainer.appendChild(pageBtn);
    }
    
    // Next Page Button
    const nextBtn = document.createElement('button');
    nextBtn.className = `w-9 h-9 rounded-full flex items-center justify-center border text-sm font-semibold transition ${currentPage === totalPages ? 'border-slate-100 text-slate-300 cursor-not-allowed' : 'border-slate-200 text-slate-700 hover:bg-slate-50 bg-white'}`;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right text-xs"></i>';
    if (currentPage < totalPages) {
        nextBtn.addEventListener('click', () => {
            renderCatalogPage(currentPage + 1);
            scrollToCatalog();
        });
    }
    paginationContainer.appendChild(nextBtn);
}

// Helper: Scroll back to catalog top smoothly after page change
function scrollToCatalog() {
    const section = document.getElementById('novidades');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// State: Add to Cart logic
function addToCart(id, title, image, price, size, color, instagramUrl) {
    // Check if item with same configuration exists
    const existingIndex = cart.findIndex(item => item.id === id && item.size === size && item.color === color);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            id,
            title,
            image,
            price,
            size,
            color,
            quantity: 1,
            instagram_url: instagramUrl
        });
    }

    // Feedback visual / Abrir carrinho
    showToast(`Adicionado: ${title} (${size} / ${color})`);
    updateCartUI();
    openCart();
}

// Toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-lg z-50 flex items-center gap-2 border border-slate-800 animate-bounce';
    toast.innerHTML = `<i class="fas fa-check-circle text-emerald-400"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 2500);
}

// Cart Drawer management
function openCart() {
    document.getElementById('cart-drawer').classList.remove('translate-x-full');
    document.getElementById('cart-overlay').classList.remove('hidden');
    document.body.classList.add('cart-open');
}

function closeCart() {
    document.getElementById('cart-drawer').classList.add('translate-x-full');
    document.getElementById('cart-overlay').classList.add('hidden');
    document.body.classList.remove('cart-open');
}

// Remove from cart
function removeItem(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// Update quantity
function changeQuantity(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    updateCartUI();
}

// Render Cart items and totals
function updateCartUI() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartBadge = document.getElementById('cart-badge');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const checkoutBtn = document.getElementById('checkout-btn');
    const formSection = document.getElementById('cart-form-section');

    cartItemsContainer.innerHTML = '';
    let totalItems = 0;
    let subtotal = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-slate-400">
                <i class="fas fa-shopping-basket text-4xl mb-3"></i>
                <p class="text-sm font-medium">Seu carrinho está vazio</p>
                <p class="text-xs mt-1">Navegue pelas novidades e escolha seus looks.</p>
            </div>
        `;
        checkoutBtn.disabled = true;
        checkoutBtn.classList.add('opacity-55', 'cursor-not-allowed');
        if (formSection) formSection.classList.add('hidden');
    } else {
        checkoutBtn.disabled = false;
        checkoutBtn.classList.remove('opacity-55', 'cursor-not-allowed');
        if (formSection) formSection.classList.remove('hidden');

        cart.forEach((item, index) => {
            totalItems += item.quantity;
            subtotal += item.price * item.quantity;

            const itemEl = document.createElement('div');
            itemEl.className = 'flex gap-4 p-4 rounded-2xl glass-dark border border-slate-100 hover:bg-white transition-colors duration-200';
            itemEl.innerHTML = `
                <img src="${item.image}" alt="${item.title}" class="w-16 h-16 object-cover rounded-xl border border-slate-200">
                <div class="flex-grow flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start">
                            <h4 class="text-sm font-bold text-slate-800 leading-snug">${item.title}</h4>
                            <button onclick="removeItem(${index})" class="text-slate-400 hover:text-rose-600 text-xs transition">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                        <p class="text-xs text-slate-500 mt-1">Tam: <span class="font-semibold text-slate-700">${item.size}</span> | Cor: <span class="font-semibold text-slate-700">${item.color}</span></p>
                    </div>
                    <div class="flex justify-between items-center mt-2">
                        <div class="flex items-center gap-2 border border-slate-200 rounded-lg bg-white px-2 py-0.5">
                            <button onclick="changeQuantity(${index}, -1)" class="text-slate-500 hover:text-slate-800 text-xs px-1">-</button>
                            <span class="text-xs font-semibold text-slate-700 w-4 text-center">${item.quantity}</span>
                            <button onclick="changeQuantity(${index}, 1)" class="text-slate-500 hover:text-slate-800 text-xs px-1">+</button>
                        </div>
                        <span class="text-sm font-bold text-slate-800">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(itemEl);
        });
    }

    // Update global counters
    cartBadge.textContent = totalItems;
    cartBadge.classList.toggle('hidden', totalItems === 0);
    cartSubtotal.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
}

// Generate message and checkout via WhatsApp
function checkout() {
    if (cart.length === 0) return;

    // Validate client details
    const nameInput = document.getElementById('client-name');
    const phoneInput = document.getElementById('client-phone');
    
    const clientName = nameInput ? nameInput.value.trim() : "";
    const clientPhone = phoneInput ? phoneInput.value.trim() : "";

    if (!clientName) {
        alert('Por favor, preencha o seu nome completo antes de finalizar o pedido.');
        if (nameInput) nameInput.focus();
        return;
    }

    if (!clientPhone) {
        alert('Por favor, preencha o seu telefone / WhatsApp de contato.');
        if (phoneInput) phoneInput.focus();
        return;
    }

    const phoneNumber = "5514998680165";
    
    // Header format
    let messageText = `✨ *NOVO PEDIDO - AQUARELA QUEIROZ* ✨\n\n`;
    messageText += `Olá! Gostaria de reservar as seguintes peças para *Retirada na Loja*:\n\n`;
    messageText += `🛍️ *ITENS DO PEDIDO:*\n`;
    
    let subtotal = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        // Formata o link da foto para ser completo na web (usando o domínio do Netlify)
        const cleanImage = item.image.split('?')[0];
        const fullImageUrl = cleanImage.startsWith('http') ? cleanImage : (window.location.origin + '/' + cleanImage);

        messageText += `• *${item.quantity}x ${item.title}*\n`;
        messageText += `  - Tam: ${item.size} | Cor: ${item.color}\n`;
        messageText += `  - Valor: R$ ${item.price.toFixed(2).replace('.', ',')} (Total: R$ ${itemTotal.toFixed(2).replace('.', ',')})\n`;
        messageText += `  - Link do Post: ${item.instagram_url || 'Não disponível'}\n`;
        messageText += `  - Link da Foto: ${fullImageUrl}\n\n`;
    });
    
    messageText += `------------------------------------\n`;
    messageText += `💰 *Subtotal Estimado:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n\n`;
    messageText += `👤 *DADOS PARA RETIRADA:*\n`;
    messageText += `• Nome do Cliente: *${clientName}*\n`;
    messageText += `• Telefone de Contato: *${clientPhone}*\n`;
    messageText += `• Modalidade: *Retirada Física na Loja* 🏢\n\n`;
    messageText += `Aguardando confirmação de disponibilidade das peças! ❤️`;

    // Encode text and create URL
    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedText}`;

    // Redirect
    window.open(whatsappUrl, '_blank');
}

// Render Reels Carousel
function renderReels(reels) {
    const reelsSection = document.getElementById('provador');
    const reelsCarousel = document.getElementById('reels-carousel');
    
    if (!reelsSection || !reelsCarousel) return;
    
    if (reels.length === 0) {
        reelsSection.classList.add('hidden');
        return;
    }
    
    reelsSection.classList.remove('hidden');
    reelsCarousel.innerHTML = '';
    
    reels.forEach(reel => {
        const title = getCleanTitle(reel.caption);
        const card = document.createElement('div');
        card.className = 'reels-card glass rounded-[2rem] overflow-hidden shadow-sm flex flex-col shrink-0 relative group snap-start cursor-pointer hover:border-rose-300 hover:shadow-md transition-all duration-300';
        
        card.innerHTML = `
            <div class="relative aspect-[9/16] overflow-hidden w-full bg-slate-950">
                <img src="${reel.image_url}" alt="${title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90">
                
                <!-- Vignette Gradient -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                
                <!-- Play Icon Overlay -->
                <div class="absolute inset-0 flex items-center justify-center">
                    <div class="w-14 h-14 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-white text-xl play-pulse group-hover:bg-rose-600 group-hover:border-rose-500 transition-colors duration-300">
                        <i class="fas fa-play ml-1"></i>
                    </div>
                </div>
                
                <!-- Bottom Caption -->
                <div class="absolute bottom-0 left-0 right-0 p-5 space-y-2">
                    <span class="inline-flex items-center px-2 py-0.5 rounded bg-rose-600/90 text-[10px] font-bold tracking-wider text-white uppercase">
                        <i class="fab fa-instagram mr-1"></i> Provador
                    </span>
                    <h3 class="text-sm font-bold text-white leading-snug font-sans line-clamp-2">${title}</h3>
                    <p class="text-white/60 text-[10px] font-medium">Toque para assistir</p>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            openVideoModal(reel);
        });
        
        reelsCarousel.appendChild(card);
    });
}

// Video Player Modal Management
function openVideoModal(reel) {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('modal-video-player');
    const source = document.getElementById('modal-video-source');
    const captionEl = document.getElementById('video-modal-caption');
    const whatsappBtn = document.getElementById('video-modal-whatsapp-btn');
    const instagramLink = document.getElementById('video-modal-instagram-link');
    const errorOverlay = document.getElementById('video-error-overlay');
    const externalLink = document.getElementById('video-error-external-link');
    
    if (!modal || !player || !source) return;
    
    // Hide warning by default
    if (errorOverlay) errorOverlay.classList.add('hidden');
    
    // Assign source and load video
    source.src = reel.video_url || "";
    player.load();
    
    // Set video error handler (to catch Instagram CDN url expirations)
    player.onerror = () => {
        if (errorOverlay) {
            errorOverlay.classList.remove('hidden');
            if (externalLink) externalLink.href = reel.instagram_url;
        }
    };
    
    // Play video
    if (reel.video_url) {
        player.play().catch(err => {
            console.log("Auto-play blocked or failed, waiting for user interaction:", err);
        });
    } else {
        // If there's no direct video URL metadata
        if (errorOverlay) {
            errorOverlay.classList.remove('hidden');
            if (externalLink) externalLink.href = reel.instagram_url;
        }
    }
    
    // Populate details
    if (captionEl) captionEl.textContent = reel.caption;
    if (instagramLink) instagramLink.href = reel.instagram_url;
    
    // Formulate WhatsApp redirect message
    const phoneNumber = "5514998680165";
    const waText = `Olá! Vi o vídeo do provador no site e gostaria de saber a disponibilidade das peças que aparecem nele:\n\n🎥 *Link do Reels:* ${reel.instagram_url}\n\n📝 *Detalhes:* \n${reel.caption.substring(0, 160)}...\n\nObrigada! ❤️`;
    
    if (whatsappBtn) {
        whatsappBtn.href = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(waText)}`;
    }
    
    // Open modal and block body scroll
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('modal-video-player');
    
    if (!modal || !player) return;
    
    player.pause();
    player.src = "";
    
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

// Product Details Modal / Bottom Sheet State
let activeModalProduct = null;

function openProductModal(product) {
    activeModalProduct = product;
    
    const modal = document.getElementById('product-modal');
    const modalContent = modal.querySelector('#product-modal > div');
    
    const imageEl = document.getElementById('product-modal-image');
    const titleEl = document.getElementById('product-modal-title');
    const oldPriceEl = document.getElementById('product-modal-old-price');
    const priceEl = document.getElementById('product-modal-price');
    const badgeEl = document.getElementById('product-modal-promo-badge');
    const descriptionEl = document.getElementById('product-modal-description');
    
    const sizesContainer = document.getElementById('product-modal-sizes');
    const colorsContainer = document.getElementById('product-modal-colors');
    
    const title = getCleanTitle(product.caption);
    const description = getCleanDescription(product.caption);
    
    // Set text details
    if (imageEl) imageEl.src = product.image_url;
    if (titleEl) titleEl.textContent = title;
    if (descriptionEl) descriptionEl.innerHTML = description || "Look maravilhoso Aquarela Queiroz, perfeito para compor seu estilo!";
    
    // Prices
    if (priceEl) priceEl.textContent = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
    
    if (product.old_price && product.old_price > product.price) {
        if (oldPriceEl) {
            oldPriceEl.textContent = `R$ ${product.old_price.toFixed(2).replace('.', ',')}`;
            oldPriceEl.classList.remove('hidden');
        }
        if (badgeEl) badgeEl.classList.remove('hidden');
    } else {
        if (oldPriceEl) oldPriceEl.classList.add('hidden');
        if (badgeEl) badgeEl.classList.add('hidden');
    }
    
    // Populate sizes
    if (sizesContainer) {
        sizesContainer.innerHTML = '';
        product.sizes.forEach((size, idx) => {
            const sizeDiv = document.createElement('div');
            sizeDiv.className = 'modal-size-selector';
            sizeDiv.innerHTML = `
                <input type="radio" id="modal-size-${size}" name="modal-size" value="${size}" class="hidden" ${idx === 0 ? 'checked' : ''}>
                <label for="modal-size-${size}" class="w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 text-xs font-semibold cursor-pointer transition hover:border-slate-800 select-none">
                    ${size}
                </label>
            `;
            sizesContainer.appendChild(sizeDiv);
        });
    }
    
    // Populate colors
    if (colorsContainer) {
        colorsContainer.innerHTML = '';
        product.colors.forEach((color, idx) => {
            const colorDiv = document.createElement('div');
            colorDiv.className = 'modal-color-selector';
            colorDiv.innerHTML = `
                <input type="radio" id="modal-color-${idx}" name="modal-color" value="${color}" class="hidden" ${idx === 0 ? 'checked' : ''}>
                <label for="modal-color-${idx}" class="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-300 cursor-pointer block hover:border-slate-800 select-none">
                    ${color}
                </label>
            `;
            colorsContainer.appendChild(colorDiv);
        });
    }
    
    // Show Modal with slide-up transition
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    // Animate slide-up
    setTimeout(() => {
        modalContent.classList.remove('translate-y-full');
    }, 10);
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    const modalContent = modal.querySelector('#product-modal > div');
    
    if (!modal || !modalContent) return;
    
    // Slide down animation
    modalContent.classList.add('translate-y-full');
    
    // Wait for transition to complete
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        activeModalProduct = null;
    }, 300);
}

// Add product to cart from details modal
function handleAddFromModal() {
    if (!activeModalProduct) return;
    
    const selectedSizeInput = document.querySelector('input[name="modal-size"]:checked');
    const selectedColorInput = document.querySelector('input[name="modal-color"]:checked');
    
    if (!selectedSizeInput || !selectedColorInput) {
        alert('Por favor, selecione as opções de tamanho e cor.');
        return;
    }
    
    const size = selectedSizeInput.value;
    const color = selectedColorInput.value;
    const title = getCleanTitle(activeModalProduct.caption);
    
    addToCart(activeModalProduct.id, title, activeModalProduct.image_url, activeModalProduct.price, size, color, activeModalProduct.instagram_url);
    
    // Close modal after adding
    closeProductModal();
}

// Helper to copy text to clipboard even in insecure contexts (non-HTTPS local IP on mobile)
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    } else {
        // Fallback using temporary textarea
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (successful) {
                return Promise.resolve();
            } else {
                return Promise.reject(new Error('ExecCommand copy failed'));
            }
        } catch (err) {
            document.body.removeChild(textarea);
            return Promise.reject(err);
        }
    }
}

// Share Look using Web Share API or Clipboard Fallback
async function shareLook() {
    if (!activeModalProduct) return;
    
    const title = getCleanTitle(activeModalProduct.caption);
    const shareText = `Olha que lindo esse look da Aquarela Queiroz: "${title}"! ✨👗\nVeja no Instagram: ${activeModalProduct.instagram_url}`;
    
    const shareData = {
        title: 'Aquarela Queiroz',
        text: `Olha que lindo esse look: "${title}"! ✨👗`,
        url: activeModalProduct.instagram_url
    };
    
    try {
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            throw new Error("Share API not available");
        }
    } catch (err) {
        // Fallback: Copy to clipboard (works on local network HTTP!)
        copyToClipboard(shareText)
            .then(() => {
                showToast('Link do look copiado para compartilhar! 🔗');
            })
            .catch(copyErr => {
                console.error('Erro ao copiar link:', copyErr);
                alert('Copie o link do post para enviar: ' + activeModalProduct.instagram_url);
            });
    }
}

// Policy Modal Management
const policyModal = document.getElementById('policy-modal');
const policyTitle = document.getElementById('policy-modal-title');
const policyContent = document.getElementById('policy-modal-content');

function openPolicyModal(type) {
    if (!policyModal || !policyTitle || !policyContent) return;
    
    if (type === 'retirada') {
        policyTitle.textContent = 'Políticas de Retirada 🏢';
        policyContent.innerHTML = `
            <p><strong>1. Prazo de Reserva:</strong> As peças selecionadas em seu pedido ficarão reservadas em nossa loja física por até <strong>48 horas</strong> a partir da confirmação do pedido no WhatsApp.</p>
            <p><strong>2. Pagamento:</strong> O pagamento do pedido é feito diretamente no ato da retirada na loja física, através de Pix, Dinheiro, Cartões de Crédito ou Débito.</p>
            <p><strong>3. Trocas:</strong> Se ao provar as peças na loja você decidir trocar por outro tamanho ou modelo, a troca poderá ser realizada imediatamente, mediante disponibilidade de estoque.</p>
            <p><strong>4. Local de Retirada:</strong> Av. Joaquim Ferreira Gandra, 43 - Queiroz / SP.</p>
        `;
    } else if (type === 'termos') {
        policyTitle.textContent = 'Termos de Uso 📝';
        policyContent.innerHTML = `
            <p><strong>1. Catálogo Informativo:</strong> Este site funciona como um catálogo interativo online conectado ao feed do nosso Instagram. Os preços e a disponibilidade das peças estão sujeitos a confirmação final via WhatsApp devido ao fluxo de vendas da loja física.</p>
            <p><strong>2. Reservas:</strong> O envio do pedido pelo WhatsApp não garante a compra imediata, servindo como uma solicitação de reserva temporária até a confirmação de estoque pela nossa equipe.</p>
            <p><strong>3. Uso de Dados:</strong> Os dados inseridos no carrinho (Nome e Telefone) são utilizados exclusivamente para identificar o seu pedido e facilitar o contato via WhatsApp, não sendo armazenados em bancos de dados externos ou compartilhados.</p>
        `;
    }
    policyModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closePolicyModal() {
    if (policyModal) {
        policyModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadCatalog();
    
    // Bind Drawer UI
    document.getElementById('cart-trigger').addEventListener('click', openCart);
    document.getElementById('cart-close').addEventListener('click', closeCart);
    document.getElementById('cart-overlay').addEventListener('click', closeCart);
    document.getElementById('checkout-btn').addEventListener('click', checkout);
    
    // Add glowing hover classes to checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.classList.add('btn-glow-hover');
    
    // Bind Video Modal UI
    const videoCloseBtn = document.getElementById('video-modal-close');
    if (videoCloseBtn) {
        videoCloseBtn.addEventListener('click', closeVideoModal);
    }
    
    const videoModal = document.getElementById('video-modal');
    if (videoModal) {
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                closeVideoModal();
            }
        });
    }

    // Bind Product Modal UI
    const productCloseBtn = document.getElementById('product-modal-close');
    if (productCloseBtn) {
        productCloseBtn.addEventListener('click', closeProductModal);
    }
    
    const productModal = document.getElementById('product-modal');
    if (productModal) {
        productModal.addEventListener('click', (e) => {
            if (e.target === productModal) {
                closeProductModal();
            }
        });
    }

    const modalAddBtn = document.getElementById('product-modal-add-btn');
    if (modalAddBtn) {
        modalAddBtn.addEventListener('click', handleAddFromModal);
    }

    const modalShareBtn = document.getElementById('product-modal-share');
    if (modalShareBtn) {
        modalShareBtn.addEventListener('click', shareLook);
    }

    // Bind Policy Modal UI
    const policyCloseBtn = document.getElementById('policy-modal-close');
    if (policyCloseBtn) {
        policyCloseBtn.addEventListener('click', closePolicyModal);
    }
    
    if (policyModal) {
        policyModal.addEventListener('click', (e) => {
            if (e.target === policyModal) {
                closePolicyModal();
            }
        });
    }

    // Bind search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            activeSearchQuery = e.target.value.toLowerCase().trim();
            filterProducts();
        });
    }

    // Bind size filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('active', 'bg-slate-900', 'text-white');
                b.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
            });
            
            btn.classList.add('active', 'bg-slate-900', 'text-white');
            btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
            
            activeSizeFilter = btn.getAttribute('data-size');
            filterProducts();
        });
    });
});
