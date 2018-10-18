//show alerts to user

export default class Toast {
  constructor(container, message, options = { buttons: ['dismiss'] }) {
    this.container = container;
    this.toast = document.createElement('div');
    this.toast.classList.add('toast', 'fadeIn');
    this.toast.insertAdjacentHTML(
      'afterbegin',
      `
    <div class="toast">
      <div class="toast__content">${message}</div>
      ${options.buttons
        .map(text => {
          return `<button class="toast__button">${text}</button>`;
        })
        .join('')}
    </div>
    `
    );
  }
  get getButtons() {
    return [...this.toast.querySelectorAll('button')];
  }

  appendToContainer() {
    this.container.appendChild(this.toast);
  }
}

// toasts.insertAdjacentHTML('afterbegin', "<div class='toast-content'>Refresh Page?</div><button>Yes</button><button>No</button>");
// const buttons = [...toasts.querySelectorAll('button')];
// document.body.appendChild(toasts)

// console.log(buttons)

// buttons.forEach(button=>button.addEventListener('click', (e)=> {
//   console.log(e.target.textContent);
//   if(e.target.textContent === 'No'){
//     toasts.classList.remove('fadeIn')
//     toasts.classList.add('fadeOut')
//     setTimeout(()=>{
//       toasts.parentNode.removeChild(toasts)
//     },900)

//   }
// }))
