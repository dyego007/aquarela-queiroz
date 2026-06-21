import os
import re
import json
import urllib.request
from curl_cffi import requests

def sync():
    # Perfil a ser sincronizado
    username = "aquarelaqueiroz"
    cookie_file = "cookies.json"
    
    if not os.path.exists(cookie_file):
        print(f"\n[ERRO] O arquivo {cookie_file} não foi encontrado na pasta do projeto.")
        print("Por favor, exporte os cookies do seu navegador Chrome/Instagram para 'cookies.json' antes de continuar.")
        return

    # 1. Carrega os cookies do arquivo JSON
    cookies = {}
    try:
        with open(cookie_file, 'r', encoding='utf-8') as f:
            cookies_list = json.load(f)
        for c in cookies_list:
            if 'instagram.com' in c.get('domain', ''):
                cookies[c.get('name')] = c.get('value')
        print("Cookies carregados com sucesso do cookies.json!")
    except Exception as e:
        print(f"Erro ao ler cookies.json: {e}")
        return

    # 2. Faz a requisição ao feed do Instagram com paginação
    url = f"https://www.instagram.com/api/v1/feed/user/{username}/username/"
    headers = {
        "Accept": "*/*",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "X-IG-App-ID": "936619743392459",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": f"https://www.instagram.com/{username}/"
    }

    try:
        print(f"Buscando as novidades do perfil @{username} via API do Instagram...")
        items = []
        max_id = None
        
        # Pagina até 8 vezes para recuperar cerca de 96 posts
        for page in range(8):
            query_url = url
            if max_id:
                query_url += f"?max_id={max_id}"
                
            print(f"Buscando página {page+1} do feed...")
            response = requests.get(query_url, headers=headers, cookies=cookies, impersonate="chrome", timeout=15)
            
            if response.status_code != 200:
                print(f"Erro ao obter a página {page+1} do feed: Status HTTP {response.status_code}")
                break
                
            data = response.json()
            page_items = data.get('items', [])
            items.extend(page_items)
            print(f"  Página {page+1} carregada. +{len(page_items)} posts recuperados.")
            
            more_available = data.get('more_available', False)
            max_id = data.get('next_max_id')
            
            if not more_available or not max_id:
                break
                
        print(f"Sincronização iniciada! Total de posts recuperados no Instagram: {len(items)}")
        
        if not items:
            print("Nenhum post retornado no feed. O Instagram pode ter bloqueado temporariamente as postagens.")
            return

        # --- BAIXAR LOGO DO PERFIL ---
        media_dir = os.path.join("data", "media")
        os.makedirs(media_dir, exist_ok=True)
        
        # Pega as informações do usuário a partir do primeiro post
        user_info = items[0].get('user', {})
        logo_url = user_info.get('profile_pic_url')
        
        if logo_url:
            print("Baixando logo oficial do perfil do Instagram...")
            try:
                logo_response = requests.get(logo_url, impersonate="chrome", timeout=15)
                if logo_response.status_code == 200:
                    with open(os.path.join(media_dir, "logo.jpg"), 'wb') as logo_file:
                        logo_file.write(logo_response.content)
                    print("Logo salvo com sucesso em data/media/logo.jpg!")
            except Exception as e:
                print(f"Não foi possível baixar o logo: {e}")

        posts_data = []
        count = 0
        
        # Limpa imagens antigas de posts (mantém o logo.jpg)
        for file in os.listdir(media_dir):
            if file.endswith(".jpg") and file != "logo.jpg":
                try:
                    os.remove(os.path.join(media_dir, file))
                except:
                    pass

        # Processa todas as publicações do feed (fotos e Reels)
        for item in items:
            code = item.get('code')
            print(f"Processando post {count+1}/{len(items)} (Código: {code})...")
            
            image_candidates = item.get('image_versions2', {}).get('candidates', [])
            if not image_candidates:
                continue
                
            img_url = image_candidates[0].get('url')
            
            # Baixa a imagem
            local_filename = f"post_{code}.jpg"
            local_path = os.path.join(media_dir, local_filename)
            
            try:
                img_response = requests.get(img_url, impersonate="chrome", timeout=15)
                if img_response.status_code == 200:
                    with open(local_path, 'wb') as img_file:
                        img_file.write(img_response.content)
                    local_image_url = f"data/media/{local_filename}"
                else:
                    local_image_url = img_url
            except Exception as download_error:
                print(f"  Erro ao baixar imagem: {download_error}. Usando URL externa.")
                local_image_url = img_url

            # Detecta se é vídeo / Reels
            is_video = (item.get('media_type') == 2) or bool(item.get('video_versions'))
            video_url = None
            if is_video:
                vv = item.get('video_versions', [])
                if vv:
                    video_url = vv[0].get('url')
                print(f"  [REELS/VÍDEO DETECTADO] URL do Vídeo recuperada.")

            # Legenda
            caption = item.get('caption', {}).get('text', '') if item.get('caption') else ''
            
            # --- PARSE INTELIGENTE DA LEGENDA ---
            price = 150.0
            old_price = None
            
            # Procura formato promocional: de R$ XX por R$ YY ou de XX por YY
            promo_match = re.search(r'(?:de|de:)\s*R\$\s*(\d+[\d.,]*)\s*por\s*R\$\s*(\d+[\d.,]*)', caption, re.IGNORECASE)
            if not promo_match:
                promo_match = re.search(r'\bde\s+(\d+[\d.,]*)\s+por\s+(\d+[\d.,]*)\b', caption, re.IGNORECASE)
                
            if promo_match:
                try:
                    old_price_str = promo_match.group(1).replace('.', '').replace(',', '.')
                    price_str = promo_match.group(2).replace('.', '').replace(',', '.')
                    old_price = float(old_price_str)
                    price = float(price_str)
                    print(f"  [PROMOÇÃO DETECTADA] De: R$ {old_price} Por: R$ {price}")
                except Exception as promo_err:
                    print(f"  Erro ao converter preços da promoção: {promo_err}")
                    old_price = None
                    price = 150.0
            else:
                # Busca preço único padrão (ex: R$ 150,00)
                price_match = re.search(r'R\$\s*(\d+[\d.,]*)', caption)
                if price_match:
                    try:
                        price_str = price_match.group(1).replace('.', '').replace(',', '.')
                        price = float(price_str)
                    except:
                        pass
                    
            sizes = ["P", "M", "G"]
            found_sizes = []
            for s in ["P", "M", "G", "GG"]:
                if re.search(r'\b' + s + r'\b', caption):
                    found_sizes.append(s)
            if found_sizes:
                sizes = found_sizes
                
            colors = ["Padrão"]
            color_match = re.search(r'(?:cores|dispon[ií]vel em|dispon[ií]vel nas cores|cor)\s*:\s*([^\n]+)', caption, re.IGNORECASE)
            if color_match:
                colors_list = [c.strip() for c in re.split(r',|e|/|;', color_match.group(1)) if c.strip()]
                colors_list = [re.sub(r'[^\w\s-]', '', c).strip() for c in colors_list]
                colors_list = [c for c in colors_list if c]
                if colors_list:
                    colors = colors_list[:4]
            
            posts_data.append({
                "id": code,
                "media_type": "VIDEO" if is_video else "IMAGE",
                "image_url": local_image_url,
                "video_url": video_url,
                "instagram_url": f"https://www.instagram.com/p/{code}/",
                "caption": caption or "Look Aquarela Queiroz",
                "price": price,
                "old_price": old_price,
                "sizes": sizes,
                "colors": colors
            })
            
            count += 1
                
        # Salva o arquivo JSON
        with open("data/instagram_posts.json", "w", encoding="utf-8") as f:
            json.dump(posts_data, f, indent=4, ensure_ascii=False)
            
        print("\n===========================================")
        print("Sincronização do catálogo concluída com sucesso!")
        print(f"Total de {count} fotos/vídeos e o logo baixados.")
        print("O arquivo data/instagram_posts.json foi atualizado.")
        print("===========================================\n")

    except Exception as e:
        print(f"Erro geral durante a sincronização: {e}")

if __name__ == "__main__":
    sync()
