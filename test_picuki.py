import requests
from bs4 import BeautifulSoup

def test_picuki():
    url = "https://www.picuki.com/profile/aquarelaqueiroz"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
    }
    try:
        response = requests.get(url, headers=headers, timeout=15)
        print(f"Status Code Picuki: {response.status_code}")
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Picuki posts are usually inside div with class "post-box" or similar
        post_boxes = soup.find_all("div", class_="post-box")
        print(f"Post Boxes encontrados: {len(post_boxes)}")
        
        if len(post_boxes) == 0:
            # Let's inspect some class names in the HTML to find posts
            # Picuki sometimes has photo links with class "photo" or inside list items
            photo_containers = soup.find_all("div", class_="photo")
            print(f"Photo containers encontrados: {len(photo_containers)}")
            post_boxes = photo_containers

        for idx, box in enumerate(post_boxes[:3]):
            print(f"\n--- Post {idx+1} ---")
            
            # Extract Image URL
            img_tag = box.find("img")
            img_url = img_tag.get("src") or img_tag.get("data-src") if img_tag else None
            
            # Extract Caption
            desc_div = box.find("div", class_="post-info-text") or box.find("p", class_="post-description")
            caption = desc_div.text.strip() if desc_div else "Sem legenda"
            
            # Extract link
            link_tag = box.find("a")
            link = link_tag.get("href") if link_tag else None
            
            print(f"Imagem URL: {img_url}")
            print(f"Legenda: {caption[:100]}...")
            print(f"Link: {link}")
            
    except Exception as e:
        print(f"Erro ao acessar Picuki: {e}")

if __name__ == "__main__":
    test_picuki()
