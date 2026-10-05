export const formatLocation = (loc) => {
    if (!loc) return '';
    return loc.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

export const PAKISTAN_CITIES = [
    "Islamabad",
    "Rawalpindi",
    "Lahore",
    "Karachi",
    "Peshawar",
    "Quetta",
    "Faisalabad",
    "Multan",
    "Bahawalpur",
    "Sialkot",
    "Gujranwala",
    "Hyderabad",
    "Abbottabad",
    "Sargodha",
    "Sukkur",
    "Jhang",
    "Sheikhupura",
    "Larkana",
    "Gujrat",
    "Mardan",
    "Kasur",
    "Rahim Yar Khan",
    "Sahiwal",
    "Okara",
    "Wah Cantonment",
    "Dera Ghazi Khan",
    "Mirpur Khas",
    "Nawabshah",
    "Mingora",
    "Chiniot"
].sort().concat("Other");

export const COUNTRIES = [
    "Pakistan",
    "Saudi Arabia",
    "United Arab Emirates",
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Germany",
    "France",
    "Turkey",
    "China",
    "Japan",
    "South Korea",
    "India",
    "Malaysia",
    "Singapore",
    "Oman",
    "Qatar",
    "Kuwait",
    "Bahrain"
].sort().concat("Other");

