import sqlite3 from "sqlite3";
import { open } from "sqlite";

const db = await open({
  filename: "./db.sqlite",
  driver: sqlite3.Database
});

const item = {
  title: process.argv[2],
  description: process.argv[3],
  link: process.argv[4],
  image: process.argv[5],
  price: process.argv[6]
};

if (!item.title) {
  console.log("Usage: node admin/add_item.js <title> <description> <link> <image> <price>");
  process.exit(1);
}

await db.run(
  "INSERT INTO wishlist (title, description, link, image, price) VALUES (?, ?, ?, ?, ?)",
  [item.title, item.description, item.link, item.image, item.price]
);

console.log(`Added "${item.title}" to wishlist!`);
