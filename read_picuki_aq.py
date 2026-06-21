from bs4 import BeautifulSoup

def read_html():
    try:
        with open("aquarela_picuki.html", "r", encoding="utf-8") as f:
            html = f.read()
            
        soup = BeautifulSoup(html, "html.parser")
        print(f"Título da página do Picuki: {soup.title.string if soup.title else 'Sem título'}")
        
        # Mostra o texto visível da página
        text = soup.get_text()
        # Limpa espaços em branco excessivos
        clean_text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
        print("\nTexto retornado na página:")
        print(clean_text[:1000])
        
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    read_html()
