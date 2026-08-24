// Flat list of known Singapore merchant names, sourced from SgMerchants.json.
// Kept as a plain JS file (not fetched JSON) so it loads via a normal
// <script> tag with no CORS issues when the HTML files are opened directly
// (file:// URLs block fetch() of local JSON in most browsers).
//
// Used by cleanOCR.js for fuzzy (Levenshtein-distance) merchant-name
// matching, to catch OCR misreads not covered by the hardcoded regex rules
// in cleanOCRText(). If you add a merchant to SgMerchants.json, add it here
// too — this file is not generated automatically from the JSON.
const SG_MERCHANTS = [
    // supermarkets_grocery
    "NTUC FairPrice", "FairPrice Finest", "FairPrice Xtra", "Cold Storage", "Giant",
    "Sheng Siong", "Prime Supermarket", "Mustafa Centre", "Little Farms", "Jason's Deli",
    "Market Place",
    // convenience
    "7-Eleven", "Cheers", "U Stars Supermart",
    // pharmacy_health
    "Guardian", "Watsons", "Unity Pharmacy", "Caring Pharmacy", "Alpha Pharmacy",
    "Eu Yan Sang", "Hockhua Tonic", "Holland & Barrett", "LAC", "Laneige",
    "Anytime Fitness", "Amore Fitness & Boutique Spa",
    // fast_food
    "McDonald's", "Burger King", "KFC", "Wendy's", "A&W", "MOS Burger", "Carl's Jr",
    "Jollibee", "Five Guys", "Shake Shack",
    // coffee_bubble_tea
    "Starbucks", "Coffee Bean", "Toast Box", "Ya Kun Kaya Toast", "Killiney Kopitiam",
    "Nanyang Old Coffee", "Ah Seng Coffee", "Oriental Kopi", "Gong Cha", "LiHO",
    "Koi Cafe", "Each A Cup", "Playmade", "Tiger Sugar", "The Alley", "Chicha San Chen",
    "Mixue", "Yifang", "Bober Tea", "Heytea", "Luckin Coffee", "%Arabica", "Compresso",
    "Flash Coffee", "Chagee",
    // hk_style_chinese
    "Tsui Wah @ JEM", "Tsui Wah", "Tasty Congee & Noodle Wantun Shop", "Ho Hung Kee", "Kam's Roast",
    "Imperial Treasure", "Wan Hao", "Yan Ting", "Mouth Restaurant", "Swatow Seafood",
    "Tung Lok", "Tung Lok Seafood", "Tung Lok Signatures", "Jumbo Seafood",
    "No Signboard Seafood", "Long Beach Seafood", "East Ocean Seafood",
    "Red House Seafood", "Crystal Jade", "Paradise Dynasty", "Tim Ho Wan",
    "Din Tai Fung", "Soup Restaurant", "Peach Garden", "LeMa Dumpling",
    // japanese
    "Ramen Keisuke", "Ippudo", "Menya Musashi", "Santouka", "Marutama", "Bari-Uma",
    "Hakata Ikkousha", "Osaka Ohsho", "Marugame Udon", "Soba Ichi", "Kimukatsu",
    "Yakiniku Like", "Gyu-Kaku", "Tajimaya", "Ichiban Boshi", "Sakae Sushi",
    "Genki Sushi", "Sushi Express", "Sushi Tei", "Itacho Sushi", "Yoshinoya",
    // korean
    "Jinjja Chicken", "Hanwoori", "Bornga", "Chir Chir", "GoGiYo", "Dookki",
    "Chicken Up",
    // western_casual
    "Astons", "Aston's Specialities", "Botak Jones", "TGI Fridays",
    "Outback Steakhouse", "Manhattan Fish Market", "Fish & Co", "The Fishmans",
    "Earle Swensen's", "Hard Rock Cafe", "Swensen's", "Poulet", "Pastamania",
    "Saizeriya", "Jack's Place", "Peperoni Pizzeria", "4 Fingers Crispy Chicken",
    "Hai Di Lao", "Canton Paradise", "Dian Xiao Er", "Beauty In The Pot", "Collin's",
    "Hot Tomato", "Greendot", "Ayam Penyet Ria", "Bangkok Jam", "Bali Thai",
    "Guzman y Gomez", "Nando's", "Go-Ang Pratunam Chicken Rice", "Hoshino Coffee",
    "Akimitsu", "Aburi-EN", "Ichikokudo Ramen", "Idaten Udon",
    "Kuriya Japanese Market", "Lao Huo Tang", "Fun Toast", "EAT.", "Food Republic",
    "Jollibean",
    // pizza
    "Domino's Pizza", "Pizza Hut", "Canadian Pizza",
    // local_singaporean_chains
    "Kopitiam", "Koufu", "Foodfare", "Food Junction", "Banquet", "Hawker's Market",
    "Old Chang Kee", "Hawker Chan", "Liao Fan", "Han's", "Stuff'd",
    // bakery_dessert
    "Breadtalk", "Four Leaves", "BreadSociety", "Paris Baguette", "Bengawan Solo",
    "Prima Deli", "Polar Puffs", "Delifrance", "Cedele", "Subway", "Auntie Anne's",
    "Dunkin' Donuts", "Famous Amos", "Beard Papa's", "Boost Juice Bars",
    "Garrett Popcorn", "Hokkaido Baked Cheese Tarts", "Chateraise",
    "Andersen's of Denmark", "Baskin Robbins", "Bee Cheng Hiang", "Fragrance Bak Kwa",
    "Emicakes", "Baker's Brew", "Chocolate Origin", "Dough Culture", "Crave",
    // retail_fashion
    "Uniqlo", "H&M", "Zara", "Cotton On", "Marks & Spencer", "Charles & Keith",
    "Pedro", "Bata", "World of Sports", "Royal Sporting House", "Decathlon",
    "Columbia Sportswear", "Nike", "Adidas", "New Balance", "Puma", "Converse",
    "Vans", "Skechers", "Crocs", "Lovisa", "Diva", "Accessorize", "Daiso",
    "Don Don Donki", "Japan Home", "Giordano", "Bossini", "G2000",
    "Benjamin Barker", "Goldlion", "Hang Ten", "Levi's", "ALDO",
    "Daniel Wellington", "City Chain", "Goldheart", "Chow Tai Fook", "Art Friend",
    "Kiddy Palace", "LEGO Certified Store", "Spotlight", "6IXTY8IGHT",
    // electronics
    "Courts", "Harvey Norman", "Best Denki", "Challenger", "iStudio", "Switch",
    "Newstead Technologies", "Gain City", "Samsung Experience Store",
    "Apple Store", "Huawei Store",
    // books_stationery
    "Popular Bookstore", "Kinokuniya", "Times Bookstore", "Typo", "Muji",
    // beauty_personal_care
    "Sephora", "Innisfree", "The Face Shop", "Etude House", "Skin Inc", "SK-II",
    "Benefit Cosmetics", "Kiehl's", "L'Occitane", "Body Shop", "Lush",
    "Bath & Body Works",
    // home_living
    "IKEA", "Scanteak", "Journey East", "Vhive", "FortyTwo", "Cellini",
    "Crate & Barrel", "Naiise", "Supermama", "Iuiga",
    // department_stores
    "Takashimaya", "Isetan", "Robinsons", "BHG", "Metro", "OG", "Tangs",
    // petrol_transport
    "Shell", "Esso", "Caltex", "SPC", "Sinopec", "ComfortDelGro", "SMRT",
    "Go-Ahead", "Grab", "Gojek", "Ryde", "TADA",
    // entertainment
    "Shaw Theatres", "Golden Village", "Cathay Cineplexes", "Timezone",
    "Virtualand", "KBox", "Party World KTV",
    // banks_finance
    "DBS", "POSB", "OCBC", "UOB", "Standard Chartered", "Citibank", "HSBC",
    "Maybank", "Bank of China", "CIMB",
    // food_delivery
    "GrabFood", "foodpanda", "Deliveroo",
    // desserts_ice_cream
    "Birds of Paradise", "Creamier", "Inside Scoop", "Udders", "Meet Fresh",
    "Ah Chew Desserts", "Lao Ban Soya Bean Curd",
    // malls
    "Aperia Mall", "Bedok Mall", "Bugis Junction", "Bugis+", "Bugis Street",
    "Bukit Panjang Plaza", "CQ @ Clarke Quay", "Funan", "IMM", "ION Orchard",
    "Jewel Changi Airport", "Junction 8", "Kallang Wave Mall", "Lot One",
    "Plaza Singapura", "Raffles City", "Sengkang Grand Mall", "SingPost Centre",
    "Tampines Mall", "Westgate", "313@somerset", "Jem", "Parkway Parade",
    "PLQ Mall", "Paya Lebar Quarter", "Orchard Central", "Clarke Quay Central",
    "Square 2", "West Coast Plaza", "One Holland Village", "Hougang 1",
    "Junction 10", "Katong V", "Greenwich V", "HillV2", "Lucky Chinatown",
    "Icon Village", "Pacific Plaza", "Riverside Point", "Woods Square",
    "Far East Square", "Far East Plaza", "Far East Shopping Centre",
    "United Square", "Velocity@Novena Square", "KINEX", "Marina Square",
    "West Mall", "VivoCity", "Harbourfront Centre", "Novena Square", "Nex",
    "Northpoint City", "Causeway Point", "Compass One", "Tampines 1",
    "Century Square", "White Sands", "Eastpoint Mall", "Changi City Point",
    "Waterway Point", "Punggol Coast Mall", "Jurong Point", "Big Box",
    "The Star Vista", "Rochester Mall", "Holland Village", "Tanglin Mall",
    "Forum The Shopping Mall", "Wheelock Place", "Paragon", "Ngee Ann City",
    "The Centrepoint", "Mandarin Gallery", "Somerset 313",
    "Cineleisure Orchard", "Scotts Square"
];
