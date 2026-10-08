/* =========================================================
   바이브 카페 주문서 - 기능(script.js)
   ========================================================= */

/* ---------------------------------------------------------
   0. Supabase 연결 설정
   ---------------------------------------------------------
   Supabase: 인터넷에 있는 데이터베이스(DB)예요. 주문을 여기에 저장해요.

   아래 두 값은 Supabase 사이트 → 내 프로젝트 → Project Settings → API 에서 복사해서 넣으세요.
   - SUPABASE_URL : 프로젝트 주소 (https://로 시작)
   - SUPABASE_KEY : "anon"(또는 "publishable") 키
     ⚠️ "service_role"(또는 "secret") 키는 절대 넣으면 안 돼요!
        이 파일은 누구나 브라우저에서 볼 수 있어서, 그 키가 들어가면 DB 전체가 위험해져요. */
const SUPABASE_URL = 'https://vuxapqydjuahnxpoxymw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGFwcXlkanVhaG54cG94eW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTUxMjcsImV4cCI6MjEwNjk3MTEyN30.uaNRNvr_630nUmyKuTvX29nVRXbVNxMslJGcqoJBVxs';

/* Supabase에 요청을 보내는 "클라이언트"를 만들어요.
   supabase.createClient(주소, 키) → index.html에서 불러온 라이브러리가 제공하는 함수예요.

   try { ... } catch { ... }
   → try 안에서 에러가 나도 페이지 전체가 멈추지 않고 catch로 넘어가게 해요.
     (URL을 아직 안 넣었거나 인터넷이 끊겨 라이브러리를 못 불러오면 여기서 에러가 나요.
      그래도 금액 계산, 탭 같은 나머지 기능은 계속 쓸 수 있어야 하니까요.) */
let supabaseClient = null;
try {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (error) {
  console.error('Supabase 연결 준비에 실패했어요. URL과 KEY를 확인하세요.', error);
}

/* ---------------------------------------------------------
   1. 화면의 요소(태그)들을 미리 찾아서 변수에 담아두기
   ---------------------------------------------------------
   document.getElementById('아이디')
   → HTML에서 id가 '아이디'인 요소를 찾아줘요.
   const는 "한 번 정하면 다시 바꾸지 않을 변수"를 만들 때 써요. */

// [주문하기 탭]
const orderForm = document.getElementById('order-form');        // 주문서 전체(form)
const nameInput = document.getElementById('customer-name');     // 이름 입력칸
const phoneInput = document.getElementById('customer-phone');   // 전화번호 입력칸
const drinkSelect = document.getElementById('drink');           // 음료 드롭다운
const quantityInput = document.getElementById('quantity');      // 수량 입력칸
const requestInput = document.getElementById('request');        // 요청사항 입력칸
const totalPriceText = document.getElementById('total-price');  // 예상 금액 숫자 부분
const orderButton = document.getElementById('order-button');    // 주문하기 버튼
const resetButton = document.getElementById('reset-button');    // 다시 작성 버튼
const orderResult = document.getElementById('order-result');    // 주문 확인 메시지 영역

// [주문 내역 탭]
const orderCountBadge = document.getElementById('order-count');       // 탭 옆 건수 배지
const emptyMessage = document.getElementById('empty-message');        // "아직 주문 내역이 없어요" 문구
const orderList = document.getElementById('order-list');              // 주문 카드가 들어갈 목록(ul)
const historySummary = document.getElementById('history-summary');    // 합계 + 전체 삭제 영역
const historyTotalText = document.getElementById('history-total');    // 총 주문 금액 숫자
const historyCountText = document.getElementById('history-count');    // 총 건수 숫자
const clearButton = document.getElementById('clear-button');          // 내역 모두 지우기 버튼

/* document.querySelectorAll('조건')
   → 조건에 맞는 요소를 "전부" 찾아서 목록으로 돌려줘요.
   input[name="size"] → name이 size인 input (사이즈 라디오 3개)
   input[name="options"] → name이 options인 input (추가 옵션 체크박스 4개)
   .tab → class가 tab인 요소 (탭 버튼 2개) */
const sizeRadios = document.querySelectorAll('input[name="size"]');
const optionCheckboxes = document.querySelectorAll('input[name="options"]');
const tabButtons = document.querySelectorAll('.tab');


/* ---------------------------------------------------------
   2. 주문 내역을 저장할 곳
   ---------------------------------------------------------
   let은 "나중에 값이 바뀔 수 있는 변수"를 만들 때 써요.
   orders: 주문 정보를 하나씩 담아두는 배열(목록)이에요. 처음엔 비어 있어요 [].
   nextOrderNumber: 다음 주문에 붙일 번호예요. 주문이 들어올 때마다 1씩 커져요.
   (취소된 번호는 다시 쓰지 않아요. 실제 카페 번호표처럼요.) */
let orders = [];
let nextOrderNumber = 1;


/* ---------------------------------------------------------
   3. 작은 도우미 함수들
   --------------------------------------------------------- */

/* 수량을 숫자로 읽어오는 함수
   입력칸의 값(value)은 항상 "글자"라서 Number()로 숫자로 바꿔야 계산할 수 있어요.
   사용자가 칸을 비우거나 0, 99처럼 범위를 벗어난 값을 넣어도
   1 ~ 10 사이로 맞춰서 돌려줘요. */
function getQuantity() {
  let quantity = Number(quantityInput.value);

  // 숫자가 아니거나(NaN) 1보다 작으면 → 1로
  if (isNaN(quantity) || quantity < 1) {
    quantity = 1;
  }
  // 10보다 크면 → 10으로
  if (quantity > 10) {
    quantity = 10;
  }
  // 소수(예: 2.5)를 넣었으면 소수점 아래를 버려요 → 2
  return Math.floor(quantity);
}

/* 지금 선택된 사이즈 라디오 버튼을 찾아주는 함수
   :checked → "선택된(체크된)" 것만 고르는 조건이에요. */
function getSelectedSize() {
  return document.querySelector('input[name="size"]:checked');
}

/* 지금 체크된 추가 옵션들만 목록으로 돌려주는 함수 */
function getCheckedOptions() {
  return document.querySelectorAll('input[name="options"]:checked');
}

/* 주문 정보로 "카페라떼 M사이즈 (샷 추가) 1잔" 같은 글자를 만들어주는 함수
   주문 확인 메시지와 주문 내역 카드에서 똑같은 문장을 쓰니까 함수로 만들어 재사용해요.
   order는 아래 7번에서 만드는 주문 객체예요. */
function makeDrinkText(order) {
  // 옵션이 있을 때만 " (샷 추가, 시럽 추가)" 같은 괄호 글자를 만들고,
  // 옵션이 없으면 빈 글자 ''로 둬서 괄호 부분이 아예 안 나오게 해요.
  // join(', ') → 배열 항목들을 ", "로 이어서 하나의 글자로 만들어요.
  let optionText = '';
  if (order.options.length > 0) {
    optionText = ' (' + order.options.join(', ') + ')';
  }

  // 백틱(`)으로 감싼 글자 안에서는 ${변수} 자리에 변수 값이 들어가요. (템플릿 문자열)
  return `${order.drink} ${order.size}사이즈${optionText} ${order.quantity}잔`;
}

/* 요소를 숨기고 보여주는 함수
   style.css의 .hidden 클래스(display: none)를 붙였다 뗐다 해요.
   classList.add('이름')    → 클래스 붙이기
   classList.remove('이름') → 클래스 떼기 */
function hide(element) {
  element.classList.add('hidden');
}

function show(element) {
  element.classList.remove('hidden');
}


/* ---------------------------------------------------------
   4. 금액 계산 함수 (가장 중요!)
   ---------------------------------------------------------
   계산 공식:
   (음료 가격 + 사이즈 추가금 + 옵션 추가금들) × 수량

   이 함수는 계산한 "숫자"를 돌려줘요(return).
   예상 금액 표시할 때도, 주문 저장할 때도
   이 함수 하나를 재사용해요. */
function calculateTotal() {
  // 4-1. 음료 가격
  // selectedIndex: 드롭다운에서 몇 번째 항목이 선택됐는지 (0부터 시작)
  // options[번호]: 그 번호의 <option> 요소
  const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];

  // 음료를 아직 고르지 않았으면(value가 빈 글자 '') 0원을 돌려주고 끝내요.
  if (drinkSelect.value === '') {
    return 0;
  }

  // dataset.price → HTML의 data-price 속성 값을 읽어와요. (글자라서 Number로 변환)
  const drinkPrice = Number(selectedDrink.dataset.price);

  // 4-2. 사이즈 추가금
  const sizePrice = Number(getSelectedSize().dataset.price);

  // 4-3. 추가 옵션 금액 (체크된 것들을 하나씩 더해요)
  let optionPrice = 0;
  // forEach: 목록 안의 항목을 하나씩 꺼내서 { } 안의 일을 반복해요.
  getCheckedOptions().forEach(function (checkbox) {
    optionPrice = optionPrice + Number(checkbox.dataset.price);
  });

  // 4-4. 한 잔 가격 × 수량 = 총 금액
  const onePrice = drinkPrice + sizePrice + optionPrice;
  const total = onePrice * getQuantity();

  return total;
}


/* ---------------------------------------------------------
   5. 예상 금액을 화면에 표시하는 함수
   ---------------------------------------------------------
   toLocaleString() → 숫자에 천 단위 콤마를 붙여줘요.
   예) 5000 → "5,000" */
function updateTotalDisplay() {
  const total = calculateTotal();
  totalPriceText.textContent = total.toLocaleString();
}


/* ---------------------------------------------------------
   6. 값이 바뀔 때마다 금액을 다시 계산하도록 연결하기
   ---------------------------------------------------------
   addEventListener('이벤트이름', 실행할함수)
   → "이 일이 생기면 이 함수를 실행해줘"라고 등록하는 방법이에요.

   'change' : 선택이 바뀌었을 때 (드롭다운, 라디오, 체크박스)
   'input'  : 글자/숫자를 입력하는 순간마다 (수량 입력칸) */

// 음료를 바꾸면 → 금액 다시 계산
drinkSelect.addEventListener('change', updateTotalDisplay);

// 사이즈 라디오 3개 각각에 연결
sizeRadios.forEach(function (radio) {
  radio.addEventListener('change', updateTotalDisplay);
});

// 추가 옵션 체크박스 4개 각각에 연결
optionCheckboxes.forEach(function (checkbox) {
  checkbox.addEventListener('change', updateTotalDisplay);
});

// 수량은 타이핑하거나 화살표를 누를 때마다 바로 반영되도록 'input' 사용
quantityInput.addEventListener('input', updateTotalDisplay);


/* ---------------------------------------------------------
   7. 주문하기 버튼 (form 제출) 처리
   ---------------------------------------------------------
   주문하기 버튼은 type="submit"이라서 누르면 form의 'submit' 이벤트가 생겨요.

   async function: 안에서 await를 쓸 수 있는 함수예요.
   await: "인터넷 요청처럼 시간이 걸리는 일이 끝날 때까지 기다려줘"라는 뜻이에요.
   DB에 저장하는 데 시간이 걸리니까, 저장이 끝난 뒤에 결과를 보고 다음 일을 하려고 써요. */
orderForm.addEventListener('submit', async function (event) {
  // 원래 form은 제출하면 페이지가 새로고침돼요.
  // preventDefault()로 그 기본 동작을 막아서, 화면에 메시지를 보여줄 수 있게 해요.
  event.preventDefault();

  // 이전에 보였던 주문 메시지는 일단 숨겨요.
  hide(orderResult);

  // 7-1. 이름 검사
  // trim() → 앞뒤 공백을 지워요. 띄어쓰기만 입력한 경우도 "비어있음"으로 처리하려고요.
  const customerName = nameInput.value.trim();
  if (customerName === '') {
    alert('이름을 입력해주세요');
    nameInput.focus();   // 이름 칸에 커서를 놓아서 바로 입력할 수 있게 해요.
    return;              // return → 여기서 함수를 끝내요. (아래 코드는 실행 안 됨)
  }

  // 7-2. 음료 선택 검사
  if (drinkSelect.value === '') {
    alert('음료를 선택해주세요');
    drinkSelect.focus();
    return;
  }

  // 7-3. 체크된 옵션 이름들을 배열(목록)에 담기 → 예) ["샷 추가", "시럽 추가"]
  const optionNames = [];
  getCheckedOptions().forEach(function (checkbox) {
    optionNames.push(checkbox.value);   // push → 배열 맨 뒤에 추가
  });

  // 7-4. 주문 1건의 정보를 객체로 묶기
  // 객체 { 이름: 값, ... } → 관련된 정보를 이름표를 붙여 한 덩어리로 묶는 방법이에요.
  const order = {
    number: nextOrderNumber,              // 주문번호 예) 1
    name: customerName,                   // 이름 예) "홍길동"
    phone: phoneInput.value.trim(),       // 전화번호 예) "010-1234-5678" (없으면 '')
    drink: drinkSelect.value,             // 음료 예) "카페라떼"
    // 음료 한 잔의 기본 가격 (사이즈/옵션 추가금 제외) 예) 4000
    drinkPrice: Number(drinkSelect.options[drinkSelect.selectedIndex].dataset.price),
    size: getSelectedSize().value,        // 사이즈 예) "M"
    options: optionNames,                 // 옵션 예) ["샷 추가"]
    quantity: getQuantity(),              // 수량 예) 1
    request: requestInput.value.trim(),   // 요청사항 예) "얼음 적게" (없으면 '')
    total: calculateTotal(),              // 금액 예) 5000 (계산 함수 재사용!)
    // 주문 시간: new Date()는 "지금 이 순간"이에요.
    // toLocaleTimeString으로 "오후 03:12" 같은 한국식 시간 글자로 바꿔요.
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  };

  // 7-5. Supabase DB에 주문 저장하기
  // 저장하는 동안 버튼을 잠가서(disabled) 두 번 눌려 주문이 중복되지 않게 해요.
  orderButton.disabled = true;
  orderButton.textContent = '저장 중...';

  const isSaved = await saveOrderToSupabase(order);

  // 저장이 끝났으니(성공이든 실패든) 버튼을 다시 원래대로 돌려놔요.
  orderButton.disabled = false;
  orderButton.textContent = '주문하기';

  // 저장에 실패했으면 알림을 띄우고 여기서 끝내요.
  // (실패한 주문은 주문 내역에도 넣지 않아요)
  if (!isSaved) {
    alert('주문 저장에 실패했어요');
    return;
  }

  // 7-6. 화면의 주문 내역에도 추가하기
  // unshift → 배열 "맨 앞"에 추가해요. 그래서 최신 주문이 항상 맨 위에 와요.
  // (push는 맨 뒤에 추가해요)
  orders.unshift(order);
  nextOrderNumber = nextOrderNumber + 1;   // 다음 주문번호 준비

  // 주문 내역 화면(목록, 배지, 합계)을 새로 그려요.
  renderOrders();

  // 7-7. 주문 확인 메시지 보여주기
  // 예) "홍길동님, 카페라떼 M사이즈 (샷 추가) 1잔, 총 5,000원 주문이 접수되었습니다!"
  const message =
    `${order.name}님, ${makeDrinkText(order)}, ` +
    `총 ${order.total.toLocaleString()}원 주문이 접수되었습니다!`;

  // textContent → 글자를 그대로 넣어요.
  // (innerHTML과 달리 사용자가 입력한 <태그> 같은 글자가 코드로 실행되지 않아서 안전해요)
  orderResult.textContent = message;
  show(orderResult);
});


/* ---------------------------------------------------------
   7-1. Supabase에 주문 1건을 저장하는 함수
   ---------------------------------------------------------
   저장에 성공하면 true, 실패하면 false를 돌려줘요.
   async 함수라서 부르는 쪽에서 await로 결과를 기다려야 해요. */
async function saveOrderToSupabase(order) {
  // 연결 준비(0번)가 실패했으면 저장할 수 없으니 바로 실패 처리
  if (supabaseClient === null) {
    console.error('Supabase 클라이언트가 없어요. script.js 맨 위의 URL과 KEY를 확인하세요.');
    return false;
  }

  // DB 테이블의 열(column) 이름에 맞춰서 저장할 데이터를 만들어요.
  // 왼쪽: DB 열 이름 / 오른쪽: 우리 주문 객체의 값
  const row = {
    customer_name: order.name,
    phone: order.phone,
    drink: order.drink,
    drink_price: order.drinkPrice,
    size: order.size,
    options: order.options,        // 배열 그대로 저장 예) ["샷 추가", "시럽 추가"]
    quantity: order.quantity,
    request: order.request,
    total_price: order.total
  };

  try {
    // from('테이블이름').insert(데이터) → 그 테이블에 새 줄(행)을 추가해요.
    // 결과로 { error }를 받아요. 문제가 없으면 error는 null이에요.
    const { error } = await supabaseClient.from('cafe_menu03').insert(row);

    if (error) {
      // console.error → 브라우저 개발자 도구(F12)의 Console 탭에 빨간 글씨로 출력돼요.
      // 왜 실패했는지(열 이름 오타, 권한 문제 등) 여기서 확인할 수 있어요.
      console.error('주문 저장 실패:', error);
      return false;
    }

    return true;
  } catch (error) {
    // 인터넷이 끊기는 등 예상 못 한 문제가 생겨도 여기로 와요.
    console.error('주문 저장 중 오류가 발생했어요:', error);
    return false;
  }
}


/* ---------------------------------------------------------
   8. 다시 작성 버튼 처리
   ---------------------------------------------------------
   주문서만 초기화해요. 주문 내역(orders)은 건드리지 않아요! */
resetButton.addEventListener('click', function (event) {
  // type="reset" 버튼의 기본 동작을 막고, 아래에서 순서대로 직접 초기화해요.
  // (기본 동작에 맡기면 금액을 다시 계산하는 타이밍이 애매해지기 때문이에요)
  event.preventDefault();

  // form.reset() → 모든 입력칸을 HTML에 처음 적혀 있던 값으로 되돌려요.
  // 그래서 사이즈는 checked가 붙어 있던 M, 수량은 value="1"로 돌아가요.
  orderForm.reset();

  // 입력이 초기화됐으니 금액도 다시 계산 → 음료가 선택 안 된 상태라 0원
  updateTotalDisplay();

  // 주문 확인 메시지도 지우고 숨기기
  orderResult.textContent = '';
  hide(orderResult);

  // 이름 칸에 커서를 놓아서 바로 다시 입력할 수 있게 해요.
  nameInput.focus();
});


/* ---------------------------------------------------------
   9. 주문 내역 화면 그리기 (목록 그리는 코드는 이 함수 하나!)
   ---------------------------------------------------------
   orders 배열의 내용을 보고 화면을 "처음부터 새로" 그려요.
   주문 추가, 취소, 전체 삭제 후에 이 함수만 부르면 화면이 항상 최신 상태가 돼요. */
function renderOrders() {
  // 9-1. 기존 목록을 싹 비우기 (안 비우면 같은 카드가 계속 쌓여요)
  orderList.textContent = '';

  // 9-2. 탭 옆 배지에 주문 건수 표시 (0건이면 배지 숨기기)
  orderCountBadge.textContent = orders.length;   // length → 배열에 든 항목 개수
  if (orders.length === 0) {
    hide(orderCountBadge);
  } else {
    show(orderCountBadge);
  }

  // 9-3. 주문이 없으면 안내 문구만 보여주고 함수 끝내기
  if (orders.length === 0) {
    show(emptyMessage);
    hide(historySummary);
    return;
  }

  // 주문이 있으면 안내 문구는 숨기고 합계 영역은 보여줘요.
  hide(emptyMessage);
  show(historySummary);

  // 9-4. 주문 하나하나를 카드로 만들어서 목록에 붙이기
  let sum = 0;   // 총 주문 금액을 더해갈 변수

  orders.forEach(function (order) {
    sum = sum + order.total;

    // document.createElement('태그') → 새 HTML 요소를 만들어요. (아직 화면엔 없음)
    const card = document.createElement('li');
    card.className = 'order-card';

    // [1줄] "#1 홍길동님 · 5,000원"
    // 이름은 손님이 입력한 글자라서 반드시 textContent로 넣어요. (보안)
    const title = document.createElement('p');
    title.className = 'order-title';
    title.textContent = `#${order.number} ${order.name}님 · ${order.total.toLocaleString()}원`;

    // [2줄] "카페라떼 M사이즈 (샷 추가) 1잔"
    const detail = document.createElement('p');
    detail.className = 'order-detail';
    detail.textContent = makeDrinkText(order);

    // [3줄] 요청사항(있을 때만) · 주문 시간
    const meta = document.createElement('p');
    meta.className = 'order-meta';
    if (order.request !== '') {
      meta.textContent = `${order.request} · ${order.time}`;
    } else {
      meta.textContent = order.time;
    }

    // [취소 버튼] 카드 오른쪽 위
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';           // form 제출 버튼이 되지 않게
    cancelButton.className = 'cancel-button';
    cancelButton.textContent = '취소';
    // 이 버튼을 누르면 "이 카드의 주문번호"를 가지고 cancelOrder를 실행해요.
    cancelButton.addEventListener('click', function () {
      cancelOrder(order.number);
    });

    // appendChild → 만든 요소를 다른 요소 "안에" 넣어요.
    card.appendChild(cancelButton);
    card.appendChild(title);
    card.appendChild(detail);
    card.appendChild(meta);

    // 완성된 카드를 목록(ul)에 넣으면 그때 화면에 나타나요.
    orderList.appendChild(card);
  });

  // 9-5. 목록 아래 합계: "총 주문 금액: 15,000원 (3건)"
  historyTotalText.textContent = sum.toLocaleString();
  historyCountText.textContent = orders.length;
}


/* ---------------------------------------------------------
   10. 주문 1건 취소하기
   ---------------------------------------------------------
   confirm('질문') → [확인] / [취소] 창을 띄워요.
   확인을 누르면 true, 취소를 누르면 false를 돌려줘요. */
function cancelOrder(orderNumber) {
  const ok = confirm(`#${orderNumber} 주문을 취소할까요?`);
  if (!ok) {
    return;   // !ok → "ok가 아니면" = 사용자가 [취소]를 눌렀으면 아무것도 안 하고 끝
  }

  // filter → 조건에 맞는 항목만 남긴 "새 배열"을 만들어요.
  // 여기서는 "주문번호가 취소할 번호와 다른 것"만 남기니까 → 그 주문만 빠져요.
  orders = orders.filter(function (order) {
    return order.number !== orderNumber;
  });

  renderOrders();   // 바뀐 내용으로 화면 다시 그리기
}


/* ---------------------------------------------------------
   11. 내역 모두 지우기 버튼
   --------------------------------------------------------- */
clearButton.addEventListener('click', function () {
  // 실수로 누를 수 있으니 한 번 더 물어봐요.
  const ok = confirm('주문 내역을 모두 지울까요?');
  if (!ok) {
    return;
  }

  orders = [];      // 빈 배열로 바꾸면 내역이 전부 사라져요.
  renderOrders();   // 화면 다시 그리기 → "아직 주문 내역이 없어요 ☕"
});


/* ---------------------------------------------------------
   12. 탭 전환
   ---------------------------------------------------------
   탭 버튼을 누르면:
   ① 모든 탭의 선택 표시(active)를 지우고, 모든 화면을 숨겨요.
   ② 누른 탭에만 active를 붙이고, 그 탭과 연결된 화면만 보여줘요. */
tabButtons.forEach(function (tab) {
  tab.addEventListener('click', function () {
    // ① 전부 초기화
    tabButtons.forEach(function (otherTab) {
      otherTab.classList.remove('active');
      otherTab.setAttribute('aria-selected', 'false');
      // dataset.panel → HTML의 data-panel 속성 값 (예: "order-panel")
      hide(document.getElementById(otherTab.dataset.panel));
    });

    // ② 누른 탭만 선택 + 연결된 화면 보이기
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    show(document.getElementById(tab.dataset.panel));
  });
});


/* ---------------------------------------------------------
   13. 페이지가 처음 열렸을 때 한 번 실행하기
   ---------------------------------------------------------
   - 예상 금액: 브라우저가 "뒤로 가기"로 돌아왔을 때 이전 선택값이 남아 있을 수 있어서,
     처음에도 한 번 계산해서 화면과 금액이 항상 맞도록 해요.
   - 주문 내역: 처음엔 비어 있으니 "아직 주문 내역이 없어요 ☕"가 보이게 그려요. */
updateTotalDisplay();
renderOrders();
