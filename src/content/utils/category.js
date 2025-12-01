/**
 * カテゴリ判定ユーティリティ
 */

/**
 * アイテムがDefault Contentかどうかを判定
 * Default Contentは、categoryが'block'、'button'、'icon'以外のもの
 * @param {Object} item - 判定するアイテム（categoryプロパティを持つ）
 * @returns {boolean} Default Contentの場合true
 */
export function isDefaultContent(item) {
  if (!item || !item.category) {
    return false;
  }
  return item.category !== 'block' && 
         item.category !== 'button' && 
         item.category !== 'icon';
}

/**
 * アイテムがBlockかどうかを判定
 * @param {Object} item - 判定するアイテム（categoryプロパティを持つ）
 * @returns {boolean} Blockの場合true
 */
export function isBlock(item) {
  if (!item || !item.category) {
    // categoryが未定義の場合はBlockとみなす
    return true;
  }
  return item.category === 'block' || 
         item.category === 'button' || 
         item.category === 'icon';
}

