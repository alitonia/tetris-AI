var flattenVal = Object.values(defaultVal)
document.querySelectorAll('.vector-display-container .current-v')
    .forEach(function (el, index) {
      el.querySelector('.val').innerText = flattenVal[index]
    })
