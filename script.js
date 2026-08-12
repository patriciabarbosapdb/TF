/* =========================================
   TF — SUPABASE
========================================= */

const SUPABASE_URL =
    'https://yyyxhrnessxvhtcjuvwh.supabase.co';

const SUPABASE_KEY =
    'sb_publishable_PmwWN4Wcke2RxuKuRUf_6Q_9O3W3nxt';


const LOGIN_EMAILS = {

    LadyWhite:
        'patriciaduartebarbosa9@gmail.com',

    LadyBlack:
        'monicaduartebarbosa@gmail.com'

};


/* =========================================
   SUPABASE
========================================= */

const sb =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================
   VARIABLES
========================================= */

let user = null;
let profile = null;

let activeTab = 'notes';
let bookStatus = 'to_read';

let audioTracks = [];
let audioIndex = 0;

let realtimeChannel = null;


/* =========================================
   HELPERS
========================================= */

const $ =
    selector =>
        document.querySelector(selector);

const $$ =
    selector =>
        [...document.querySelectorAll(selector)];


const esc =
    value =>
        (value ?? '')
            .toString()
            .replace(
                /[&<>"']/g,
                char => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                }[char])
            );


const validUrl =
    value =>
        /^https?:\/\//i.test(value || '')
            ? value
            : '';


/* =========================================
   LOGIN ERROR
========================================= */

function showError(message) {

    const element =
        $('#loginError');

    if (element) {
        element.textContent =
            message;
    }

}


/* =========================================
   BOOT
========================================= */

async function boot() {

    if (!window.supabase) {

        showError(
            'A biblioteca do Supabase não foi carregada.'
        );

        return;
    }


    const {
        data,
        error
    } =
        await sb.auth.getSession();


    if (error) {

        console.error(error);

        showError(
            'Não foi possível iniciar a sessão.'
        );

        return;
    }


    if (data.session) {

        user =
            data.session.user;

        await loadProfile();


        if (profile) {
            showApp();
        }

    }


    sb.auth.onAuthStateChange(
        async (_event, session) => {

            if (session) {

                user =
                    session.user;

                await loadProfile();


                if (profile) {
                    showApp();
                }

            } else {

                user = null;
                profile = null;

                $('#app')
                    ?.classList
                    .add('hidden');

                $('#login')
                    ?.classList
                    .remove('hidden');

            }

        }
    );

}


/* =========================================
   PROFILE
========================================= */

async function loadProfile() {

    if (!user) return;


    const {
        data: p,
        error
    } =
        await sb
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();


    if (error) {

        console.error(error);

        showError(
            error.message
        );

        return;
    }


    if (p) {

        profile = p;

        return;
    }


    const username =
        Object.keys(
            LOGIN_EMAILS
        ).find(
            key =>
                LOGIN_EMAILS[key]
                    .toLowerCase() ===
                user.email
                    ?.toLowerCase()
        );


    if (!username) {

        profile = null;

        return;
    }


    const {
        data: created,
        error: insertError
    } =
        await sb
            .from('profiles')
            .insert({
                id: user.id,
                username
            })
            .select()
            .single();


    if (insertError) {

        console.error(
            insertError
        );

        showError(
            'Não foi possível criar o perfil.'
        );

        return;
    }


    profile = created;

}


/* =========================================
   SHOW APP
========================================= */

function showApp() {

    if (!profile) {

        showError(
            'Esta conta não está autorizada no TF.'
        );

        return;
    }


    $('#login')
        ?.classList
        .add('hidden');

    $('#app')
        ?.classList
        .remove('hidden');


    const name =
        profile.username;


    if ($('#homeName')) {

        $('#homeName')
            .textContent =
            name;

    }


    if ($('#drawerName')) {

        $('#drawerName')
            .textContent =
            name;

    }


    const avatar =
        $('#avatar') ||
        $('#drawerAvatar');


    if (avatar) {

        avatar.textContent =
            name === 'LadyWhite'
                ? 'W'
                : 'B';

    }


    loadAll();

    subscribeRealtime();

}

/* LOGIN */

const loginUser = $('#loginUser');

if (loginUser) {
  loginUser.addEventListener('change', e => {
    const input = $('#loginEmail');

    if (input) {
      input.value = LOGIN_EMAILS[e.target.value] || '';
    }
  });

  const input = $('#loginEmail');

  if (input) {
    input.value = LOGIN_EMAILS[loginUser.value] || '';
  }
}
/* =========================================
   MOSTRAR / ESCONDER PASSE
========================================= */

const $ = selector =>
  document.querySelector(selector);


$('#showPassword')?.addEventListener(
  'click',
  () => {

    const input =
      $('#loginPassword');

    if (!input) return;

    if (input.type === 'password') {

      input.type = 'text';

    } else {

      input.type = 'password';

    }

  }
);


/* ENTER NO CAMPO DA PASSWORD */

$('#loginPassword')?.addEventListener(
  'keydown',
  e => {

    if (e.key === 'Enter') {
      login();
    }

  }
);

$('#loginBtn')?.addEventListener('click', login);

async function login() {
  const email = $('#loginEmail')?.value.trim();
  const password = $('#loginPassword')?.value;

  if (!email || !password) {
    showError('Preenche o email e o passe.');
    return;
  }

  const { error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error(error);
    showError('Email ou passe incorrecto.');
  }
}

$('#logoutBtn')?.addEventListener('click', () => {
  sb.auth.signOut();
});


    $('#forgotPassword')?.addEventListener(
  'click',
  async () => {

    const email =
      $('#loginEmail')?.value.trim();

    if (!email) {
      showError(
        'Escolhe uma pessoa ou escreve o email.'
      );
      return;
    }

    const { error } =
      await sb.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            'https://patriciabarbosapdb.github.io/TF/'
        }
      );

    if (error) {
      console.error(
        'Erro ao pedir recuperação:',
        error
      );

      showError(
        'Não foi possível enviar o email.'
      );

      return;
    }

    showError(
      'Enviámos um email para redefinir o passe.'
    );
  }
);

/* NAVEGAÇÃO */

function go(page) {
  const target = $('#' + page);

  if (!target) {
    console.warn(`Página "${page}" não encontrada.`);
    return;
  }

  $$('.page').forEach(p => {
    p.classList.remove('active');
  });

  target.classList.add('active');

  closeDrawer();

  if (page === 'chat') {
    loadChat();
  }

  if (page === 'references') {
    loadRefs();
  }

  if (page === 'personal') {
    loadPersonal();
  }

  window.scrollTo(0, 0);
}

$$('[data-page]').forEach(button => {
  button.addEventListener('click', () => {
    go(button.dataset.page);
  });
});


/* MENU */

$('#menuBtn')?.addEventListener('click', () => {
  $('#drawer')?.classList.add('open');

  $('#backdrop')?.classList.remove('hidden');

  $('#drawerBackdrop')?.classList.remove('hidden');
});

$('#closeDrawer')?.addEventListener('click', closeDrawer);

$('#backdrop')?.addEventListener('click', closeDrawer);

$('#drawerBackdrop')?.addEventListener('click', closeDrawer);

function closeDrawer() {
  $('#drawer')?.classList.remove('open');

  $('#backdrop')?.classList.add('hidden');

  $('#drawerBackdrop')?.classList.add('hidden');
}

const quickButton = $('#quickBtn') || $('#homeQuick');

if (quickButton) {
  quickButton.addEventListener('click', () => {
    go('quick');
  });
}


/* CHAT */

async function loadChat() {
  if (!user) return;

  const { data, error } = await sb
    .from('messages')
    .select(
      'id,body,created_at,user_id'
    )
    .order('created_at', {
      ascending: true
    })
    .limit(300);

  if (error) {
    console.error(error);
    return;
  }

  const ids = [
    ...new Set(
      (data || []).map(x => x.user_id)
    )
  ];

  const names = {};

  if (ids.length) {
    const r = await sb
      .from('profiles')
      .select('id,username')
      .in('id', ids);

    (r.data || []).forEach(x => {
      names[x.id] = x.username;
    });
  }

  const container = $('#messages');

  if (!container) return;

  container.innerHTML = (data || [])
    .map(message => {
      const time =
        new Date(
          message.created_at
        ).toLocaleTimeString(
          'pt-PT',
          {
            hour: '2-digit',
            minute: '2-digit'
          }
        );

      return `
        <div class="message ${
          message.user_id === user.id
            ? 'me'
            : ''
        }">

          <small>
            ${esc(
              names[message.user_id] || 'TF'
            )}
            ·
            ${time}
          </small>

          <div class="bubble">
            ${esc(message.body).replace(
              /\n/g,
              '<br>'
            )}
          </div>

        </div>
      `;
    })
    .join('');
}

$('#chatForm')?.addEventListener(
  'submit',
  async e => {
    e.preventDefault();

    if (!user) return;

    const input = $('#messageInput');

    const body =
      input?.value.trim();

    if (!body) return;

    input.disabled = true;

    const { error } = await sb
      .from('messages')
      .insert({
        user_id: user.id,
        body
      });

    input.disabled = false;

    if (error) {
      console.error(error);

      showError(
        'Não foi possível enviar a mensagem.'
      );

      return;
    }

    input.value = '';
    input.focus();

    await loadChat();
  }
);


/* REFERÊNCIAS */

async function loadRefs() {
  const { data, error } = await sb
    .from('references')
    .select('*')
    .order('created_at', {
      ascending: false
    });

  if (error) {
    console.error(error);
    return;
  }

  const container =
    $('#referenceGrid');

  if (!container) return;

  const refs = data || [];

  container.innerHTML =
    refs.map((r, i) => {
      const image =
        url(r.image_url);

      const link =
        url(r.link_url);

      return `
        <article class="reference">

          <div
            class="ref-image"
            ${
              image
                ? `style="background-image:url('${esc(
                    image
                  )}')"`
                : ''
            }
          >
            ${image ? '' : '✦'}
          </div>

          <div class="ref-body">

            <span class="micro">
              REF ${String(i + 1).padStart(2, '0')}
            </span>

            <h3>
              ${esc(r.title)}
            </h3>

            <p>
              ${esc(r.note || '')}
            </p>

            ${
              link
                ? `
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="${esc(link)}"
                  >
                    Abrir ↗
                  </a>
                `
                : ''
            }

          </div>

        </article>
      `;
    }).join('');

  if (!refs.length) {
    container.innerHTML = `
      <p
        style="
          padding:16px;
          color:#888;
          font-size:11px;
        "
      >
        Ainda não existem referências.
      </p>
    `;
  }
}

$('#newReference')?.addEventListener(
  'click',
  () => {
    $('#refModal')?.classList.remove(
      'hidden'
    );
  }
);

$$('[data-close]').forEach(button => {
  button.addEventListener('click', () => {
    $('#' + button.dataset.close)
      ?.classList.add('hidden');
  });
});

$('#refForm')?.addEventListener(
  'submit',
  async e => {
    e.preventDefault();

    if (!user) return;

    const payload = {
      user_id: user.id,

      title:
        $('#refTitle')?.value.trim(),

      image_url:
        $('#refImage')?.value.trim()
          || null,

      link_url:
        $('#refLink')?.value.trim()
          || null,

      note:
        $('#refNote')?.value.trim()
          || null
    };

    if (!payload.title) return;

    const { error } =
      await sb
        .from('references')
        .insert(payload);

    if (error) {
      console.error(error);

      alert(
        'Não foi possível guardar.'
      );

      return;
    }

    e.target.reset();

    $('#refModal')
      ?.classList.add('hidden');

    loadRefs();
  }
);


/* ESPAÇO PESSOAL */

$$('[data-tab]').forEach(button => {
  button.addEventListener(
    'click',
    () => {
      activeTab =
        button.dataset.tab;

      $$('[data-tab]').forEach(
        item => {
          item.classList.toggle(
            'active',
            item.dataset.tab ===
              activeTab
          );
        }
      );

      $$('.panel').forEach(
        panel => {
          panel.classList.remove(
            'active'
          );
        }
      );

      $('#tab-' + activeTab)
        ?.classList.add('active');

      if (
        activeTab === 'books' ||
        activeTab === 'tasks'
      ) {
        loadPersonal();
      }
    }
  );
});


/* NOTAS */

let noteTimer;

$('#notes')?.addEventListener(
  'input',
  () => {
    clearTimeout(noteTimer);

    noteTimer = setTimeout(
      async () => {
        if (!user) return;

        const { error } =
          await sb
            .from('notes')
            .upsert(
              {
                user_id: user.id,
                body: $('#notes').value,
                updated_at:
                  new Date().toISOString()
              },
              {
                onConflict:
                  'user_id'
              }
            );

        if (error) {
          console.error(error);
        }
      },
      500
    );
  }
);

$('#saveQuick')?.addEventListener(
  'click',
  async () => {
    if (!user) return;

    const { error } =
      await sb
        .from('notes')
        .upsert(
          {
            user_id: user.id,

            quick:
              $('#quickText')
                ?.value || '',

            updated_at:
              new Date().toISOString()
          },
          {
            onConflict:
              'user_id'
          }
        );

    if (error) {
      console.error(error);
      return;
    }

    const button =
      $('#saveQuick');

    if (button) {
      button.textContent =
        'Guardado ✓';

      setTimeout(() => {
        button.textContent =
          'Guardar';
      }, 1000);
    }
  }
);


/* LIVROS E TAREFAS */

async function loadPersonal() {
  if (!user) return;

  const n =
    await sb
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

  if (n.data) {
    if ($('#notes')) {
      $('#notes').value =
        n.data.body || '';
    }

    if ($('#quickText')) {
      $('#quickText').value =
        n.data.quick || '';
    }
  }

  const b =
    await sb
      .from('books')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', bookStatus)
      .order('created_at', {
        ascending: false
      });

  const bookList =
    $('#bookList');

  if (bookList) {
    bookList.innerHTML =
      (b.data || [])
        .map(book => `
          <div class="list-item">

            <span>
              ${esc(book.title)}
            </span>

            <button
              onclick="deleteBook('${esc(
                book.id
              )}')"
            >
              ×
            </button>

          </div>
        `)
        .join('')
        ||
        `
          <p
            style="
              font-size:11px;
              color:#999;
            "
          >
            Ainda não tens livros
            nesta lista.
          </p>
        `;
  }

  const t =
    await sb
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', {
        ascending: false
      });

  const taskList =
    $('#taskList');

  if (taskList) {
    taskList.innerHTML =
      (t.data || [])
        .map(task => `
          <div
            class="list-item ${
              task.done
                ? 'done'
                : ''
            }"
          >

            <input
              class="check"
              type="checkbox"
              ${
                task.done
                  ? 'checked'
                  : ''
              }

              onchange="toggleTask(
                '${esc(task.id)}',
                ${!task.done}
              )"
            >

            <span>
              ${esc(task.title)}
            </span>

            <button
              onclick="deleteTask(
                '${esc(task.id)}'
              )"
            >
              ×
            </button>

          </div>
        `)
        .join('')
        ||
        `
          <p
            style="
              font-size:11px;
              color:#999;
            "
          >
            Ainda não tens tarefas.
          </p>
        `;
  }
}

$$('[data-list]').forEach(button => {
  button.addEventListener(
    'click',
    () => {
      $$('.book-tabs button')
        .forEach(x => {
          x.classList.remove(
            'active'
          );
        });

      button.classList.add(
        'active'
      );

      bookStatus =
        button.dataset.list;

      loadPersonal();
    }
  );
});

let inputMode = '';

function openInput(
  title,
  placeholder,
  mode
) {
  inputMode = mode;

  if ($('#inputTitle')) {
    $('#inputTitle').textContent =
      title;
  }

  if ($('#inputValue')) {
    $('#inputValue').placeholder =
      placeholder;

    $('#inputValue').value = '';
  }

  $('#inputModal')
    ?.classList.remove('hidden');

  setTimeout(() => {
    $('#inputValue')?.focus();
  }, 100);
}

$('#addBook')?.addEventListener(
  'click',
  () => {
    openInput(
      'Adicionar livro',
      'Nome do livro',
      'book'
    );
  }
);

$('#addTask')?.addEventListener(
  'click',
  () => {
    openInput(
      'Nova tarefa',
      'O que tens de fazer?',
      'task'
    );
  }
);

$('#inputSave')?.addEventListener(
  'click',
  async () => {
    if (!user) return;

    const value =
      $('#inputValue')
        ?.value.trim();

    if (!value) return;

    let result;

    if (inputMode === 'book') {
      result =
        await sb
          .from('books')
          .insert({
            user_id: user.id,
            title: value,
            status: bookStatus
          });
    } else {
      result =
        await sb
          .from('tasks')
          .insert({
            user_id: user.id,
            title: value,
            done: false
          });
    }

    if (result.error) {
      console.error(
        result.error
      );

      alert(
        'Não foi possível guardar.'
      );

      return;
    }

    $('#inputModal')
      ?.classList.add('hidden');

    loadPersonal();
  }
);

window.deleteBook =
  async id => {
    if (!user) return;

    const { error } =
      await sb
        .from('books')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
      console.error(error);
    }

    loadPersonal();
  };

window.toggleTask =
  async (id, done) => {
    if (!user) return;

    const { error } =
      await sb
        .from('tasks')
        .update({ done })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
      console.error(error);
    }

    loadPersonal();
  };

window.deleteTask =
  async id => {
    if (!user) return;

    const { error } =
      await sb
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
      console.error(error);
    }

    loadPersonal();
  };

// ==========================================
// TF MUSIC
// Supabase Storage + Database
// ==========================================

let tracks = [];
let audioIndex = 0;


// ------------------------------------------
// ABRIR SELEÇÃO DE MÚSICA
// ------------------------------------------

$('#addMusic')?.addEventListener('click', () => {
  $('#audioFiles')?.click();
});


// ------------------------------------------
// ADICIONAR MÚSICAS
// ------------------------------------------

$('#audioFiles')?.addEventListener('change', async (e) => {

  const files = [...e.target.files];

  if (!files.length) return;

  await uploadMusic(files);

  // Permite voltar a escolher o mesmo ficheiro
  e.target.value = '';
});


// ------------------------------------------
// UPLOAD PARA SUPABASE
// ------------------------------------------

async function uploadMusic(files) {

  const button = $('#addMusic');

  if (button) {
    button.disabled = true;
    button.textContent = 'A adicionar...';
  }

  try {

    for (const file of files) {

      // Só aceitar ficheiros de áudio
      if (!file.type.startsWith('audio/')) {
        continue;
      }


      const extension =
        file.name.includes('.')
          ? file.name.split('.').pop()
          : 'mp3';


      const title =
        file.name
          .replace(/\.[^/.]+$/, '')
          .trim();


      // Nome único para o Storage
      const filePath =
        `${user.id}/${crypto.randomUUID()}.${extension}`;


      // Upload do ficheiro
      const upload =
        await sb.storage
          .from('tf-music')
          .upload(
            filePath,
            file,
            {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type
            }
          );


      if (upload.error) {

        console.error(
          'Erro no upload:',
          upload.error
        );

        alert(
          `Não foi possível adicionar "${file.name}".`
        );

        continue;
      }


      // Criar URL pública
      const publicUrl =
        sb.storage
          .from('tf-music')
          .getPublicUrl(filePath);


      // Guardar informação na BD
      const { error } =
        await sb
          .from('music')
          .insert({
            user_id: user.id,
            title: title || file.name,
            file_path: filePath,
            file_url: publicUrl.data.publicUrl
          });


      if (error) {

        console.error(
          'Erro na BD:',
          error
        );


        // Se falhar a BD,
        // apagar o ficheiro do Storage
        await sb.storage
          .from('tf-music')
          .remove([filePath]);


        alert(
          `Não foi possível guardar "${file.name}".`
        );
      }
    }


    // Recarregar lista
    await loadMusic();


  } catch (error) {

    console.error(error);

    alert(
      'Ocorreu um erro ao adicionar a música.'
    );


  } finally {

    if (button) {
      button.disabled = false;
      button.textContent =
        '+ Adicionar música';
    }
  }
}


// ------------------------------------------
// CARREGAR TODAS AS MÚSICAS
// ------------------------------------------

async function loadMusic() {

  const { data, error } =
    await sb
      .from('music')
      .select('*')
      .order('created_at', {
        ascending: true
      });


  if (error) {

    console.error(
      'Erro ao carregar músicas:',
      error
    );

    return;
  }


  tracks = data || [];


  // Não existem músicas
  if (!tracks.length) {

    audioIndex = 0;

    const audio = $('#audio');

    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }


    if ($('#trackTitle')) {
      $('#trackTitle').textContent =
        'TF playlist';
    }


    if ($('#trackArtist')) {
      $('#trackArtist').textContent =
        'Escolhe música';
    }


    if ($('#musicName')) {
      $('#musicName').textContent =
        'Ainda não existem músicas.';
    }


    renderMusicList();

    return;
  }


  // Garantir índice válido
  if (
    audioIndex < 0 ||
    audioIndex >= tracks.length
  ) {
    audioIndex = 0;
  }


  renderMusicList();
}


// ------------------------------------------
// MOSTRAR LISTA
// ------------------------------------------

function renderMusicList() {

  const list = $('#musicList');

  if (!list) return;


  if (!tracks.length) {

    list.innerHTML = `
      <p class="empty-music">
        Ainda não adicionaram músicas.
      </p>
    `;

    return;
  }


  list.innerHTML =
    tracks.map((track, index) => {

      const active =
        index === audioIndex
          ? 'active'
          : '';


      const owner =
        track.user_id === user.id
          ? 'Adicionada por ti'
          : 'Adicionada pela outra pessoa';


      return `
        <div
          class="music-item ${active}"
        >

          <button
            class="music-select"
            data-index="${index}"
          >

            <span class="music-number">
              ${String(index + 1).padStart(2, '0')}
            </span>

            <span class="music-item-info">

              <strong>
                ${esc(track.title)}
              </strong>

              <small>
                ${owner}
              </small>

            </span>

            <span class="music-play">
              ${
                index === audioIndex
                  ? 'Ⅱ'
                  : '▶'
              }
            </span>

          </button>


          ${
            track.user_id === user.id
              ? `
                <button
                  class="music-delete"
                  data-id="${track.id}"
                >
                  ×
                </button>
              `
              : ''
          }

        </div>
      `;

    }).join('');


  // Selecionar música
  list
    .querySelectorAll('.music-select')
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          const index =
            Number(button.dataset.index);

          selectTrack(index);

        }
      );

    });


  // Apagar música
  list
    .querySelectorAll('.music-delete')
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          deleteMusic(button.dataset.id);

        }
      );

    });
}


// ------------------------------------------
// ESCOLHER MÚSICA
// ------------------------------------------

function selectTrack(index) {

  if (!tracks[index]) return;


  audioIndex = index;


  const track =
    tracks[audioIndex];


  const audio =
    $('#audio');


  if (!audio) return;


  audio.src =
    track.file_url;


  audio.load();


  if ($('#trackTitle')) {
    $('#trackTitle').textContent =
      track.title;
  }


  if ($('#trackArtist')) {

    $('#trackArtist').textContent =
      track.user_id === user.id
        ? 'Adicionada por ti'
        : 'Adicionada pela outra pessoa';

  }


  if ($('#musicName')) {
    $('#musicName').textContent =
      track.title;
  }


  renderMusicList();


  audio
    .play()
    .then(() => {

      if ($('#play')) {
        $('#play').textContent =
          'Ⅱ';
      }

    })
    .catch(() => {});
}


// ------------------------------------------
// PLAY / PAUSE
// ------------------------------------------

$('#play')?.addEventListener(
  'click',
  () => {

    const audio =
      $('#audio');


    if (!audio?.src) return;


    if (audio.paused) {

      audio.play();

      $('#play').textContent =
        'Ⅱ';

    } else {

      audio.pause();

      $('#play').textContent =
        '▶';
    }

  }
);


// ------------------------------------------
// ANTERIOR
// ------------------------------------------

$('#prev')?.addEventListener(
  'click',
  () => {

    if (!tracks.length) return;


    audioIndex =
      (
        audioIndex -
        1 +
        tracks.length
      ) %
      tracks.length;


    selectTrack(audioIndex);

  }
);


// ------------------------------------------
// PRÓXIMA
// ------------------------------------------

$('#next')?.addEventListener(
  'click',
  () => {

    if (!tracks.length) return;


    audioIndex =
      (
        audioIndex +
        1
      ) %
      tracks.length;


    selectTrack(audioIndex);

  }
);


// ------------------------------------------
// TERMINOU → PRÓXIMA
// ------------------------------------------

$('#audio')?.addEventListener(
  'ended',
  () => {

    if (!tracks.length) return;

    $('#next')?.click();

  }
);


// ------------------------------------------
// PROGRESSO
// ------------------------------------------

$('#audio')?.addEventListener(
  'timeupdate',
  () => {

    const audio =
      $('#audio');

    const progress =
      $('#progress');


    if (
      !audio ||
      !progress ||
      !audio.duration
    ) {

      if (progress) {
        progress.style.width =
          '0%';
      }

      return;
    }


    const percentage =
      (
        audio.currentTime /
        audio.duration
      ) * 100;


    progress.style.width =
      `${percentage}%`;

  }
);


// ------------------------------------------
// APAGAR MÚSICA
// ------------------------------------------

async function deleteMusic(id) {

  const track =
    tracks.find(
      item => item.id === id
    );


  if (!track) return;


  const confirmed =
    confirm(
      `Queres apagar "${track.title}"?`
    );


  if (!confirmed) return;


  // Apagar ficheiro do Storage
  const storage =
    await sb.storage
      .from('tf-music')
      .remove([
        track.file_path
      ]);


  if (storage.error) {

    console.error(
      storage.error
    );

    alert(
      'Não foi possível apagar o ficheiro.'
    );

    return;
  }


  // Apagar registo da BD
  const database =
    await sb
      .from('music')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);


  if (database.error) {

    console.error(
      database.error
    );

    alert(
      'Não foi possível apagar a música.'
    );

    return;
  }


  // Se apagámos a música que estava a tocar
  const audio =
    $('#audio');


  if (audio) {

    audio.pause();

    audio.removeAttribute('src');

    audio.load();
  }


  audioIndex = 0;


  await loadMusic();
}


/* CARREGAMENTO */

async function loadAll() {
  await Promise.all([
    loadChat(),
    loadRefs(),
    loadPersonal(),
    loadMusic()
  ]);
}


/* REALTIME */

function subscribeRealtime() {
  if (realtimeChannel)
    return;

  realtimeChannel =
    sb
      .channel('tf-live')

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        loadChat
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'references'
        },
        loadRefs
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes'
        },
        loadPersonal
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'books'
        },
        loadPersonal
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        loadPersonal
      )

      .subscribe(
        status => {
          console.log(
            'TF realtime:',
            status
          );
        }
      );
}

boot();
async function testSupabase() {

    console.log('A testar Supabase...');

    const { data, error } =
        await sb
            .from('profiles')
            .select('id, username')
            .limit(2);

    if (error) {

        console.error(
            '❌ SUPABASE ERRO:',
            error
        );

        return;
    }

    console.log(
        '✅ SUPABASE LIGADO:',
        data
    );
}

testSupabase();
