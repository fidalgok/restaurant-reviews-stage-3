import axios from 'axios';

function updateHeart(e) {
  e.preventDefault();
  console.log('HEART ITTT!!!!!!!!!!!!!!!!');

  axios
    .put(this.action, {
      is_favorite: this.dataset.heart,
    })
    .then(res => {
      console.log(res);
      const isHearted = this.heart.classList.toggle('heart__button--hearted');

      if (isHearted) {
        this.heart.classList.add('heart__button--float');
        setTimeout(
          () => this.heart.classList.remove('heart__button--float'),
          2500
        );
      }
    })
    .catch(console.error);
}

export default updateHeart;
