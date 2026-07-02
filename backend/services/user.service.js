const db = require('../config/db');
const UserProfileService = {
  async updateUserInfoWithSync(userInfo, dbInstance) {
    const dbPromise = dbInstance.promise();
    await dbPromise.beginTransaction();
    try {
      const sqlUserInfo = `
        INSERT INTO user_info (user_id, full_name, date_of_birth, gender, address, phone, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          date_of_birth = VALUES(date_of_birth),
          gender = VALUES(gender),
          address = VALUES(address),
          phone = VALUES(phone),
          image_url = IF(VALUES(image_url) IS NOT NULL, VALUES(image_url), image_url)
      `;
      await dbPromise.query(sqlUserInfo, [
        userInfo.user_id, userInfo.full_name, userInfo.date_of_birth,
        userInfo.gender, userInfo.address, userInfo.phone, userInfo.image_url
      ]);

      if (userInfo.full_name) {
        await dbPromise.query('UPDATE users SET name = ? WHERE id = ?', [userInfo.full_name, userInfo.user_id]);
      }

      await dbPromise.commit();
      return { success: true };
    } catch (err) {
      await dbPromise.rollback();
      throw err;
    }
  }
};



module.exports = UserProfileService;
