import os
import json

def generate_mock_data():
    posts = [
        {
            "id": "post_1",
            "image_url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80",
            "instagram_url": "https://www.instagram.com/p/C-example1/",
            "caption": "✨ CONJUNTO AQUARELA PASTEL ✨\nConforto e estilo em um só look! Feito em linho leve, perfeito para dias quentes. Disponível nas cores: Rosa Millennial, Azul Serenity e Verde Menta. \nComposição: 100% Algodão.\n🏷️ R$ 189,90",
            "price": 189.90,
            "sizes": ["P", "M", "G"],
            "colors": ["Rosa Millennial", "Azul Serenity", "Verde Menta"]
        },
        {
            "id": "post_2",
            "image_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80",
            "instagram_url": "https://www.instagram.com/p/C-example2/",
            "caption": "🌸 VESTIDO MIDI ROMANCE 🌸\nO queridinho da temporada chegou! Detalhes em lastex no busto e mangas bufantes que dão aquele ar romântico. \nCores disponíveis: Lavanda e Off-White. \n👗 Use e abuse dos acessórios!\n🏷️ R$ 229,90",
            "price": 229.90,
            "sizes": ["P", "M", "G", "GG"],
            "colors": ["Lavanda", "Off-White"]
        },
        {
            "id": "post_3",
            "image_url": "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&fit=crop&q=80",
            "instagram_url": "https://www.instagram.com/p/C-example3/",
            "caption": "🌻 VESTIDO SOL DA MANHÃ 🌻\nEstampa floral vibrante e fresca. Perfeito para passeios no fim de semana ou um almoço especial. \nDisponível em: Floral Pêssego e Floral Margarida.\n☀️ Sinta a energia do verão!\n🏷️ R$ 159,90",
            "price": 159.90,
            "sizes": ["P", "M", "G"],
            "colors": ["Floral Pêssego", "Floral Margarida"]
        },
        {
            "id": "post_4",
            "image_url": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&auto=format&fit=crop&q=80",
            "instagram_url": "https://www.instagram.com/p/C-example4/",
            "caption": "☁️ CASACO TRICOT NUVEM ☁️\nPara os dias mais frescos, um tricot leve, macio e super aconchegante. Modelagem oversized para te deixar estilosa sem esforço. \nCores: Creme, Areia e Lilás Pastel.\n🏷️ R$ 199,90",
            "price": 199.90,
            "sizes": ["M", "G"],
            "colors": ["Creme", "Areia", "Lilás Pastel"]
        },
        {
            "id": "post_5",
            "image_url": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80",
            "instagram_url": "https://www.instagram.com/p/C-example5/",
            "caption": "🍋 MACACÃO PANTALONA CITRUS 🍋\nFluidez, elegância e cor! Aquele look que chama atenção pela sofisticação. Possui amarração nas costas e tecido crepe premium. \nCores: Amarelo Pastel e Terracota Suave.\n🏷️ R$ 249,90",
            "price": 249.90,
            "sizes": ["P", "M", "G"],
            "colors": ["Amarelo Pastel", "Terracota Suave"]
        },
        {
            "id": "post_6",
            "image_url": "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80",
            "instagram_url": "https://www.instagram.com/p/C-example6/",
            "caption": "🌿 BLUSA LINHO TROPICAL 🌿\nBásica, mas cheia de charme. Detalhes de botões de madeira e decote em V. Combina perfeitamente com shorts ou calça jeans. \nCores: Menta e Off-White.\n🏷️ R$ 119,90",
            "price": 119.90,
            "sizes": ["P", "M", "G", "GG"],
            "colors": ["Menta", "Off-White"]
        }
    ]

    # Garante que o diretório data existe
    os.makedirs("data", exist_ok=True)

    with open("data/instagram_posts.json", "w", encoding="utf-8") as f:
        json.dump(posts, f, indent=4, ensure_ascii=False)

    print("Arquivo data/instagram_posts.json gerado com sucesso!")

if __name__ == "__main__":
    generate_mock_data()
