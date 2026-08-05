const FILE_PATH='assets/data/products.json';
let session={owner:'',repo:'',token:'',sha:'',products:[]};

function api(path){return `https://api.github.com/repos/${session.owner}/${session.repo}${path}`}
function headers(){return{'Accept':'application/vnd.github+json','Authorization':`Bearer ${session.token}`,'X-GitHub-Api-Version':'2022-11-28'}}
function encodeUtf8(value){return btoa(unescape(encodeURIComponent(value)))}
function decodeUtf8(value){return decodeURIComponent(escape(atob(value.replace(/\n/g,''))))}
function message(id,text,error=false){const node=document.getElementById(id);node.textContent=text;node.style.color=error?'#ff8d8d':'#aaa'}

async function login(){
  session.owner=document.getElementById('owner').value.trim();
  session.repo=document.getElementById('repo').value.trim();
  session.token=document.getElementById('token').value.trim();
  if(!session.owner||!session.repo||!session.token){message('login-message','заполните все поля',true);return}
  message('login-message','проверка доступа...');
  try{
    const response=await fetch(api(`/contents/${FILE_PATH}`),{headers:headers(),cache:'no-store'});
    if(!response.ok)throw new Error(`github: ${response.status}`);
    const file=await response.json();
    session.sha=file.sha;
    session.products=JSON.parse(decodeUtf8(file.content));
    sessionStorage.setItem('6months-admin',JSON.stringify({owner:session.owner,repo:session.repo,token:session.token}));
    document.getElementById('login-panel').hidden=true;
    document.getElementById('editor').hidden=false;
    renderEditor();
  }catch(error){console.error(error);message('login-message','не удалось войти. проверьте логин, репозиторий и права token: contents read/write',true)}
}

function renderEditor(){
  const root=document.getElementById('product-editor');
  root.innerHTML=session.products.map((product,index)=>`
    <article class="product-editor-card" data-product="${index}">
      <h2>${product.name}</h2>
      <div class="editor-grid">
        <div class="field"><label>название<input data-field="name" value="${product.name}"></label></div>
        <div class="field"><label>цена<input data-field="price" type="number" min="0" value="${product.price??''}" ${product.madeToOrder?'disabled':''}></label></div>
        <div class="field"><label>видимость<select data-field="visible"><option value="true" ${product.visible!==false?'selected':''}>показывать</option><option value="false" ${product.visible===false?'selected':''}>скрыть</option></select></label></div>
      </div>
      ${product.madeToOrder?'':`<div class="sizes-editor"><strong>размеры и наличие</strong><div class="size-list">${(product.sizes||[]).map((size,sizeIndex)=>sizeRow(size,sizeIndex)).join('')}</div><button class="add-size" data-action="add-size">добавить размер</button></div>`}
    </article>`).join('');

  root.querySelectorAll('[data-action="add-size"]').forEach((button)=>button.addEventListener('click',()=>{
    const productIndex=Number(button.closest('[data-product]').dataset.product);
    session.products[productIndex].sizes.push({label:'',stock:0});
    renderEditor();
  }));
  root.querySelectorAll('[data-action="remove-size"]').forEach((button)=>button.addEventListener('click',()=>{
    const card=button.closest('[data-product]');
    session.products[Number(card.dataset.product)].sizes.splice(Number(button.dataset.size),1);
    renderEditor();
  }));
}

function sizeRow(size,index){return `<div class="size-row" data-size-row="${index}"><div class="field"><label>размер<input data-size-field="label" value="${size.label}"></label></div><div class="field"><label>наличие<input data-size-field="stock" type="number" min="0" value="${size.stock??''}" placeholder="пусто = уточняется"></label></div><button data-action="remove-size" data-size="${index}">удалить</button></div>`}

function collect(){
  document.querySelectorAll('[data-product]').forEach((card)=>{
    const index=Number(card.dataset.product);const product=session.products[index];
    product.name=card.querySelector('[data-field="name"]').value.trim().toLowerCase();
    const price=card.querySelector('[data-field="price"]');if(price&&!price.disabled)product.price=Number(price.value||0);
    product.visible=card.querySelector('[data-field="visible"]').value==='true';
    card.querySelectorAll('[data-size-row]').forEach((row)=>{
      const sizeIndex=Number(row.dataset.sizeRow);const stockValue=row.querySelector('[data-size-field="stock"]').value;
      product.sizes[sizeIndex]={label:row.querySelector('[data-size-field="label"]').value.trim().toLowerCase(),stock:stockValue===''?null:Number(stockValue)};
    });
  });
}

async function save(){
  collect();message('save-message','сохранение...');
  try{
    const response=await fetch(api(`/contents/${FILE_PATH}`),{method:'PUT',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({message:'update catalog from глав.net',content:encodeUtf8(JSON.stringify(session.products,null,2)+'\n'),sha:session.sha,branch:'main'})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.message||'save failed');
    session.sha=result.content.sha;
    message('save-message','готово. наличие на сайте обновится после публикации github pages.');
  }catch(error){console.error(error);message('save-message',`ошибка сохранения: ${error.message}`,true)}
}

document.addEventListener('DOMContentLoaded',()=>{
  const saved=JSON.parse(sessionStorage.getItem('6months-admin')||'null');
  if(saved){document.getElementById('owner').value=saved.owner;document.getElementById('repo').value=saved.repo;document.getElementById('token').value=saved.token}
  document.getElementById('login').addEventListener('click',login);
  document.getElementById('save').addEventListener('click',save);
});
