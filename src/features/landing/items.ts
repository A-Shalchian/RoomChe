export type Specimen = {
  slug: string;
  name: string;
  category: string;
  location: string;
  why: string;
  image: string;
  acquired: string;
  cutout?: boolean;
};

const U = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&h=600&q=80`;

export const specimens: Specimen[] = [
  {
    slug: "shirt-1",
    name: "Blue Oxford Shirt",
    category: "Clothing",
    location: "closet",
    why: "For the meetings that pretend to matter.",
    image: U("photo-1602810318383-e386cc2a3ccf"),
    acquired: "mmxxii · spring",
  },
  {
    slug: "press-1",
    name: "French Press",
    category: "Kitchen",
    location: "kitchen",
    why: "The morning ritual. Cracked but pouring.",
    image: U("photo-1544776193-352d25ca82cd"),
    acquired: "mmxx · winter",
  },
  {
    slug: "book-1",
    name: "Worn Paperback Novel",
    category: "Books",
    location: "bedroom",
    why: "Re-read in the bathtub, twice a year.",
    image: U("photo-1544947950-fa07a98d237f"),
    acquired: "mmxix · summer",
  },
  {
    slug: "note-1",
    name: "Leather Notebook",
    category: "Desk",
    location: "office",
    why: "Currently in use. Half its pages are dreams.",
    image: U("photo-1531346878377-a5be20888e57"),
    acquired: "mmxxv · autumn",
  },
  {
    slug: "cam-1",
    name: "Film Camera",
    category: "Electronics",
    location: "living room",
    why: "Inherited. The shutter still sings.",
    image: U("photo-1526170375885-4d8ecf77b99f"),
    acquired: "mmxvii · bequest",
  },
  {
    slug: "necklace-1",
    name: "Gold Necklace",
    category: "Jewelry",
    location: "bedroom",
    why: "Worn on the days that count.",
    image: U("photo-1599643478518-a784e5dc4c8f"),
    acquired: "mmxxi · gift",
  },
  {
    slug: "tea-1",
    name: "Tea Tin",
    category: "Kitchen",
    location: "kitchen",
    why: "Jasmine, half-full, smells like a previous life.",
    image: U("photo-1597481499750-3e6b22637e12"),
    acquired: "mmxxiii · winter",
  },
  {
    slug: "coat-1",
    name: "Navy Peacoat",
    category: "Clothing",
    location: "closet",
    why: "For winter, and for grief.",
    image: U("photo-1591047139829-d91aecb6caea"),
    acquired: "mmxviii · november",
  },
  {
    slug: "atlas-1",
    name: "Hardcover Atlas",
    category: "Books",
    location: "living room",
    why: "A gift from someone who believed in maps.",
    image: U("photo-1521587760476-6c12a4b040da"),
    acquired: "mmxvi · birthday",
  },
  {
    slug: "lamp-1",
    name: "Desk Lamp",
    category: "Lighting",
    location: "office",
    why: "The pool of light I actually work in.",
    image: U("photo-1507473885765-e6ed057f782c"),
    acquired: "mmxx · housewarming",
  },
  {
    slug: "kb-1",
    name: "Mechanical Keyboard",
    category: "Electronics",
    location: "office",
    why: "Loud enough to be a witness.",
    image: U("photo-1587829741301-dc798b83add3"),
    acquired: "mmxxiii · march",
  },
  {
    slug: "knife-1",
    name: "Chef Knife",
    category: "Kitchen",
    location: "kitchen",
    why: "Sharp, patient, used every day.",
    image: U("photo-1593618998160-e34014e67546"),
    acquired: "mmxx · housewarming",
  },
];
