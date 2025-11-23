import { SUPABASE_URL, SUPABASE_ANON_KEY, TASKS_TABLE } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const table = TASKS_TABLE || 'tasks';

const el = {
  input: document.getElementById('task-input'),
  reminder: document.getElementById('reminder-input'),
  addBtn: document.getElementById('add-btn'),
  list: document.getElementById('tasks-list'),
  showCompleted: document.getElementById('show-completed'),
  container: document.querySelector('.container'),
  title: document.querySelector('h1')
};

el.addBtn.addEventListener('click', addTask);
el.input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') addTask(); });
el.showCompleted.addEventListener('change', renderTasks);

// button ripple effect
document.addEventListener('pointerdown', (e)=>{
  const b = e.target.closest('.btn');
  if(!b) return;
  const r = document.createElement('span');
  r.className = 'ripple';
  const rect = b.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.style.width = r.style.height = size + 'px';
  r.style.left = (e.clientX - rect.left - size/2) + 'px';
  r.style.top = (e.clientY - rect.top - size/2) + 'px';
  b.appendChild(r);
  setTimeout(()=> r.remove(), 700);
});

let tasks = [];

// Reminder notification tracking to avoid duplicate notifications for same task timestamp
const shownReminders = new Map();

// Request notification permission on load (best-effort)
function requestNotificationPermission(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default'){
    Notification.requestPermission().then(permission => {
      console.log('Notification permission:', permission);
    });
  }
}

function showReminderNotification(task){
  if(!('Notification' in window)){
    return alert(`Reminder: ${task.title}`);
  }
  if(Notification.permission !== 'granted') return;
  const key = `${task.id}:${task.reminder}`;
  if(shownReminders.has(key)) return;
  const dt = new Date(task.reminder);
  const n = new Notification('Task Reminder', {
    body: `${task.title}\nAt ${dt.toLocaleString()}`,
    tag: key,
    renotify: false
  });
  shownReminders.set(key, true);
  // play a short tone
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.01);
    o.connect(g); g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{ o.stop(); ctx.close(); }, 600);
  }catch(e){ /* ignore audio errors */ }

  n.onclick = async () => {
    window.focus();
    // scroll to the task element if present
    try{
      const elTask = document.querySelector(`[data-id='${task.id}']`);
      if(elTask){
        elTask.scrollIntoView({ behavior: 'smooth', block: 'center' });
        elTask.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)';
        setTimeout(()=> elTask.style.boxShadow = '', 3000);
      }
    }catch(e){}

    // offer a snooze option
    const snooze = confirm('Snooze this reminder for 5 minutes? Click Cancel to dismiss.');
    if(snooze){
      const newTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      try{
        await supabase.from(table).update({ reminder: newTime }).eq('id', task.id);
        // update local task copy
        const it = tasks.find(t => t.id === task.id);
        if(it) it.reminder = newTime;
        renderTasks();
      }catch(e){ console.error('Snooze update failed', e); }
    }
  };
}

function checkReminders(){
  const now = Date.now();
  tasks.forEach(t => {
    if(!t.reminder || t.is_complete) return;
    const when = new Date(t.reminder).getTime();
    // notify when reminder time has passed within last 5 minutes
    if(when <= now && now - when < 5 * 60 * 1000){
      showReminderNotification(t);
    }
  });
}

window.addEventListener('load', init);
// ask for notification permission when user interacts
requestNotificationPermission();
setInterval(checkReminders, 30 * 1000);

async function init(){
  await fetchTasks();
  setupRealtime();
}

async function fetchTasks(){
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false });
  if(error){ console.error('Fetch error', error); return; }
  tasks = data || [];
  renderTasks();
  // check reminders after tasks loaded
  checkReminders();
}

function renderTasks(){
  const showCompleted = el.showCompleted.checked;
  el.list.innerHTML = '';
  const visible = tasks.filter(t => showCompleted ? true : !t.is_complete);
  if(visible.length === 0){
    const li = document.createElement('li');
    li.textContent = 'No tasks yet';
    li.className = 'task';
    el.list.appendChild(li);
    return;
  }

  visible.forEach(t => {
    const li = document.createElement('li');
    li.className = 'task';
    li.dataset.id = t.id;
    // entrance animation with stagger
    li.classList.add('enter');
    li.style.animationDelay = (Math.min(10, visible.indexOf(t)) * 30) + 'ms';

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = !!t.is_complete;
    chk.addEventListener('change', ()=> toggleComplete(t.id, chk.checked));

    const titleWrap = document.createElement('div');
    titleWrap.className = 'title';
    const title = document.createElement('div');
    title.textContent = t.title;
    if(t.is_complete) title.classList.add('completed');
    titleWrap.appendChild(title);
    if(t.reminder){
      const sm = document.createElement('small');
      const dt = new Date(t.reminder);
      sm.textContent = `Reminder: ${dt.toLocaleString()}`;
      sm.className = 'reminder-time';
      // add bell indicator
      const bell = document.createElement('span');
      bell.className = 'reminder-bell';
      bell.textContent = '🔔';
      // mark upcoming if within 1 hour
      const now = Date.now();
      const when = dt.getTime();
      if(when > now && when - now < 60 * 60 * 1000){
        bell.classList.add('upcoming');
      }
      titleWrap.appendChild(bell);
      titleWrap.appendChild(sm);
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', ()=> startEdit(t, titleWrap));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', ()=> deleteTask(t.id));

    const snoozeBtn = document.createElement('button');
    snoozeBtn.className = 'btn';
    snoozeBtn.textContent = 'Snooze';
    snoozeBtn.addEventListener('click', async ()=>{
      const newTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { error } = await supabase.from(table).update({ reminder: newTime }).eq('id', t.id);
      if(error){ console.error('Snooze error', error); return; }
      t.reminder = newTime;
      renderTasks();
    });

    actions.appendChild(editBtn);
    actions.appendChild(snoozeBtn);
    actions.appendChild(delBtn);

    li.appendChild(chk);
    li.appendChild(titleWrap);
    li.appendChild(actions);
    el.list.appendChild(li);
  });
}

async function addTask(){
  const title = el.input.value.trim();
  const reminder = el.reminder.value ? new Date(el.reminder.value).toISOString() : null;
  if(!title) return;
  el.addBtn.disabled = true;
  console.log('Adding task:', { title, reminder });
  const { data, error } = await supabase
    .from(table)
    .insert([{ title, is_complete: false, reminder }])
    .select()
    .single();
  console.log('Insert result:', { data, error });
  el.addBtn.disabled = false;
  if(error){ console.error('Insert error', error); return; }
  el.input.value = '';
  el.reminder.value = '';
  // the realtime subscription will pick this up; also update local list optimistically
  tasks.unshift(data);
  renderTasks();
}

async function toggleComplete(id, isComplete){
  const { error } = await supabase
    .from(table)
    .update({ is_complete: isComplete })
    .eq('id', id);
  if(error){ console.error('Update error', error); }
  // optimistic update
  const item = tasks.find(t => t.id === id);
  if(item) item.is_complete = isComplete;
  renderTasks();
}

function startEdit(task, titleWrap){
  titleWrap.innerHTML = '';
  const input = document.createElement('input');
  input.value = task.title;
  input.style.padding = '6px';
  const remInput = document.createElement('input');
  remInput.type = 'datetime-local';
  if(task.reminder) remInput.value = new Date(task.reminder).toISOString().slice(0,16);
  const save = document.createElement('button');
  save.className = 'btn';
  save.textContent = 'Save';
  const cancel = document.createElement('button');
  cancel.className = 'btn';
  cancel.textContent = 'Cancel';

  save.addEventListener('click', async ()=>{
    const newTitle = input.value.trim();
    const newRem = remInput.value ? new Date(remInput.value).toISOString() : null;
    if(!newTitle) return;
    const { error } = await supabase
      .from(table)
      .update({ title: newTitle, reminder: newRem })
      .eq('id', task.id);
    if(error){ console.error('Edit error', error); return; }
    task.title = newTitle;
    task.reminder = newRem;
    renderTasks();
  });

  cancel.addEventListener('click', ()=> renderTasks());
  titleWrap.appendChild(input);
  titleWrap.appendChild(remInput);
  titleWrap.appendChild(save);
  titleWrap.appendChild(cancel);
}

async function deleteTask(id){
  if(!confirm('Delete task?')) return;
  // remove with exit animation, then delete from DB
  const li = document.querySelector(`[data-id='${id}']`);
  if(li){
    li.classList.remove('enter');
    li.classList.add('exit');
    // wait for animation to finish
    li.addEventListener('animationend', async ()=>{
      const { error } = await supabase.from(table).delete().eq('id', id);
      if(error){ console.error('Delete error', error); return; }
      tasks = tasks.filter(t => t.id !== id);
      renderTasks();
    }, { once: true });
  }else{
    const { error } = await supabase.from(table).delete().eq('id', id);
    if(error){ console.error('Delete error', error); return; }
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
  }
}

function setupRealtime(){
  // Attempt realtime subscription; fallback to polling if not available
  try{
    // v1/v2 compatibility: try .from(...).on
    if(typeof supabase.from === 'function' && typeof supabase.channel !== 'function'){
      // older style
      supabase
        .from(`${table}`)
        .on('*', payload => {
          fetchTasks();
        })
        .subscribe();
    }else if(typeof supabase.channel === 'function'){
      // v2 style
      const channel = supabase.channel('public:' + table)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          fetchTasks();
        })
        .subscribe();
    }else{
      // unknown client, fallback
      console.warn('Realtime not available on this supabase client — using polling');
      setInterval(fetchTasks, 5000);
    }
  }catch(err){
    console.warn('Realtime setup failed; falling back to polling', err);
    setInterval(fetchTasks, 5000);
  }
}
