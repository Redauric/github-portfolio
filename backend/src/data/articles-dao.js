import yup from "yup";
import { getDatabase } from "./database.js";
import { updateDatabase } from "./util.js";

/**
 * Gets all articles or a specific article by id.
 * If an article_id is provided, returns that article; otherwise, returns all articles.
 * @param {number | null} article_id - The id of the article to retrieve, or `null` to get all articles.
 * @returns {Promise<Object | Array>} A Promise that resolves to an article object if article_id is provided, or an array of all articles if article_id is null.
 */
export async function getArticles(article_id) {
  const db = await getDatabase();
  if (article_id) {
    return await db.get(
      "SELECT a.*, u.username AS 'username', u.user_avatar_url FROM Articles a, Users u WHERE a.user_id = u.user_id AND a.article_id = ?",
      article_id
    );
  }
  return await db.all(
    "SELECT a.*, u.username AS 'username', u.user_avatar_url FROM Articles a, Users u WHERE a.user_id = u.user_id"
  );
}

/**
 * Gets all articles by a specific user id.
 * @param {number} user_id - The id of the user whose articles are to be retrieved.
 * @returns {Promise<Array<Object>>} A Promise that resolves to an array of article objects, each containing details like article_id, title, content, date, and other relevant fields.
 */
export async function getArticlesByUserId(user_id) {
  const db = await getDatabase();
  return await db.all("SELECT * FROM Articles WHERE user_id = ?", user_id);
}

/**
 * Schema to define a valid create article request.
 * Required fields: title, date, user id, text, and genre.
 * Optional: subtitle and image.
 */
const createArticleSchema = yup
  .object({
    article_id: yup.number().optional(),
    article_image_url: yup.string().optional(),
    article_title: yup.string().min(1).required(),
    article_subtitle: yup.string().optional(),
    article_date: yup
      .string()
      .default(() => new Date())
      .required(),
    user_id: yup.number().required(),
    article_text: yup.string().min(1).required(),
    article_genre: yup
      .string()
      .oneOf([
        "Business",
        "Entertainment",
        "Travel",
        "Technology",
        "Lifestyle and Art",
        "Food and Health"
      ])
      .required()
  })
  .required();

/**
 * Validates, creates, and returns a new article.
 *
 * @param {Object} articleData - The data for the new article.
 * @returns {Promise<Object>} The newly created article.
 * @throws {ValidationError} If any required data is missing or invalid.
 */
export async function createArticle(articleData) {
  const newArticle = createArticleSchema.validateSync(articleData, {
    abortEarly: false,
    stripUnknown: true
  });

  // Insert new article in the database.
  const db = await getDatabase();
  const dbResult = await db.run(
    "INSERT INTO Articles(article_image_url, article_title, article_subtitle, article_date, user_id, article_text, article_genre) VALUES(?, ?, ?, ?, ?, ?, ?)",
    newArticle.article_image_url,
    newArticle.article_title,
    newArticle.article_subtitle,
    newArticle.article_date,
    newArticle.user_id,
    newArticle.article_text,
    newArticle.article_genre
  );

  // Assigns the article_id generated by the database to the new article object and returns it.
  newArticle.article_id = dbResult.lastID;
  return newArticle;
}

/**
 * Schema for updating an article.
 * Users can update: image, title, subtitle, date, text, and genre
 * Users cannot update: user id.
 *
 * Extra properties will be stripped due to .noUnknown().
 */
const updateArticleSchema = yup
  .object({
    article_image_url: yup.string().optional(),
    article_title: yup.string().min(1).optional(),
    article_subtitle: yup.string().optional(),
    article_date: yup.string().optional(),
    article_text: yup.string().min(1).optional(),
    article_genre: yup
      .string()
      .oneOf([
        "Business",
        "Entertainment",
        "Travel",
        "Technology",
        "Lifestyle and Art",
        "Food and Health"
      ])
      .optional()
  })
  .noUnknown()
  .required();

/**
 * Updates the article with the given id using the updated data, if the article exists.
 * Optional updated data includes title, content, and genre.
 * @param {number} article_id - The id of the article to update.
 * @param {Object} updateData - The updated data for the article.
 * @returns {Promise<boolean>} True if changes were applied, false if not.
 */
export async function updateArticle(article_id, updateData) {
  const parsedUpdateData = updateArticleSchema.validateSync(updateData, {
    abortEarly: false,
    stripUnknown: true
  });

  const db = await getDatabase();
  const dbResult = await updateDatabase(db, "Articles", parsedUpdateData, article_id, "article_id");

  return dbResult.changes > 0;
}

/**
 * Deletes the article with the given id, if it exists.
 * @param {number} article_id - The id of the article to delete.
 * @returns {Promise<boolean>} True if the article was deleted, false if not.
 */
export async function deleteArticle(article_id) {
  const db = await getDatabase();
  const dbResult = await db.run("DELETE FROM Articles WHERE article_id = ?", parseInt(article_id));
  return dbResult.changes > 0;
}

/**
 * Deletes all articles by the user with the given user id.
 * @param {number} user_id - The id of the user whose articles are to be deleted.
 * @returns {Promise<boolean>} True if articles were deleted, false if not.
 */
export async function deleteArticlesByUserId(user_id) {
  const db = await getDatabase();
  const dbResult = await db.run("DELETE FROM Articles WHERE user_id = ?", parseInt(user_id));
  return dbResult.changes > 0;
}
