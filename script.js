/* =========================================
   TF — SUPABASE
========================================= */

const SUPABASE_URL =
    'https://yyyxhrnessxvhtcjuvwh.supabase.co';

const SUPABASE_KEY =
    'sb_publishable_PmwWN4Wcke2RxuKuRUf_6Q_9O3W3nxt';

const LOGIN_EMAILS = {
    LadyWhite: 'patriciaduartebarbosa9@gmail.com',
    LadyBlack: 'monicaduartebarbosa@gmail.com'
};


/* =========================================
   SUPABASE
========================================= */

if (!window.supabase) {
    console.error('Supabase não foi carregado.');
}

const sb = window.supabase
    ? window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      )
    : null;


/* =========================================
   VARIABLES
========================================= */

let user = null;
let profile = null;

let activeTab = 'notes';
let bookStatus = 'to_read';

let tracks = [];
let audioIndex = 0;

let realtimeChannel = null;

let noteTimer = null;
let inputMode = '';


/* =========================================
   HELPERS
========================================= */

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    document.querySelectorAll(selector);


const esc = value =>
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


const validUrl = value =>
    /^https?:\/\//i.test(value || '')
        ? value
        : '';


function showError(message) {

    const element = $('#loginError');

    if (element) {
        element.textContent = message;
    }

    console.error(message);
}


/* =========================================
   BOOT
========================================= */

async function boot() {

    if (!sb) {

        showError(
            'A biblioteca do Supabase não foi carregada.'
        );

        return;
    }


    try {

        const {
            data,
            error
        } = await sb.auth.getSession();


        if (error) {

            console.error(error);

            showError(
                'Não foi possível iniciar a sessão.'
            );

            return;
        }


        if (data.session) {

            user = data.session.user;

            await loadProfile();

            if (profile) {
                showApp();
            } else {
                showLogin();
            }

        } else {

            showLogin();

        }


        sb.auth.onAuthStateChange(
            async (_event, session) => {

                if (session) {

                    user = session.user;

                    await loadProfile();

                    if (profile) {
                        showApp();
                    } else {
                        showLogin();
                    }

                } else {

                    user = null;
                    profile = null;

                    if (realtimeChannel) {

                        await sb
                            .removeChannel(
                                realtimeChannel
                            );

                        realtimeChannel = null;
                    }

                    showLogin();

                }

            }
        );

    } catch (error) {

        console.error(
            'Erro no boot:',
            error
        );

        showError(
            'Ocorreu um erro ao iniciar o TF.'
        );
    }
}


/* =========================================
   LOGIN / LOGOUT UI
========================================= */

function showLogin() {

    $('#app')
        ?.classList
        .add('hidden');

    $('#login')
        ?.classList
        .remove('hidden');
}


function showApp() {

    if (!profile) {

        showError(
            'Esta conta não está autorizada no TF.'
        );

        showLogin();

        return;
    }


    $('#login')
        ?.classList
        .add('hidden');

    $('#app')
        ?.classList
        .remove('hidden');


    const name = profile.username;


    if ($('#homeName')) {

        $('#homeName').textContent =
            name;

    }


    if ($('#drawerName')) {

        $('#drawerName').textContent =
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


/* =========================================
   PROFILE
========================================= */

async function loadProfile() {

    if (!user || !sb) return;


    const {
        data: p,
        error
    } = await sb
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();


    if (error) {

        console.error(
            'Erro ao carregar perfil:',
            error
        );

        showError(
            'Não foi possível carregar o perfil.'
        );

        profile = null;

        return;
    }


    if (p) {

        const allowed =
            Object.values(LOGIN_EMAILS)
                .some(
                    email =>
                        email.toLowerCase() ===
                        user.email?.toLowerCase()
                );


        if (!allowed) {

            profile = null;

            return;
        }


        profile = p;

        return;
    }


    const username =
        Object.keys(LOGIN_EMAILS).find(
            key =>
                LOGIN_EMAILS[key].toLowerCase() ===
                user.email?.toLowerCase()
        );


    if (!username) {

        profile = null;

        return;
    }


    const {
        data: created,
        error: insertError
    } = await sb
        .from('profiles')
        .insert({
            id: user.id,
            username
        })
        .select()
        .single();


    if (insertError) {

        console.error(
            'Erro ao criar perfil:',
            insertError
        );

        showError(
            'Não foi possível criar o perfil.'
        );

        profile = null;

        return;
    }


    profile = created;
}


/* =========================================
   LOGIN
========================================= */

const loginUser = $('#loginUser');

if (loginUser) {

    loginUser.addEventListener(
        'change',
        e => {

            const input =
                $('#loginEmail');

            if (input) {

                input.value =
                    LOGIN_EMAILS[
                        e.target.value
                    ] || '';

            }

        }
    );


    const input =
        $('#loginEmail');

    if (input) {

        input.value =
            LOGIN_EMAILS[
                loginUser.value
            ] || '';

    }
}


/* =========================================
   MOSTRAR / ESCONDER PASSE
========================================= */

$('#showPassword')?.addEventListener(
    'click',
    () => {

        const input =
            $('#loginPassword');

        if (!input) return;


        input.type =
            input.type === 'password'
                ? 'text'
                : 'password';

    }
);


/* =========================================
   ENTER PASSWORD
========================================= */

$('#loginPassword')?.addEventListener(
    'keydown',
    e => {

        if (e.key === 'Enter') {
            login();
        }

    }
);


$('#loginBtn')?.addEventListener(
    'click',
    login
);


async function login() {

    if (!sb) return;


    const email =
        $('#loginEmail')
            ?.value
            .trim();

    const password =
        $('#loginPassword')
            ?.value;


    if (!email || !password) {

        showError(
            'Preenche o email e o passe.'
        );

        return;
    }


    const { error } =
        await sb.auth.signInWithPassword({
            email,
            password
        });


    if (error) {

        console.error(error);

        showError(
            'Email ou passe incorrecto.'
        );

        return;
    }


    showError('');

}


/* =========================================
   LOGOUT
========================================= */

$('#logoutBtn')?.addEventListener(
    'click',
    async () => {

        if (!sb) return;

        await sb.auth.signOut();

    }
);


/* =========================================
   RECUPERAR PASSE
========================================= */

$('#forgotPassword')?.addEventListener(
    'click',
    async () => {

        if (!sb) return;


        const email =
            $('#loginEmail')
                ?.value
                .trim();


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


/* =========================================
   NAVEGAÇÃO
========================================= */

function go(page) {

    const target =
        $('#' + page);


    if (!target) {

        console.warn(
            `Página "${page}" não encontrada.`
        );

        return;
    }


    $$('.page').forEach(
        p => {
            p.classList.remove('active');
        }
    );


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


$$('[data-page]').forEach(
    button => {

        button.addEventListener(
            'click',
            () => {
                go(button.dataset.page);
            }
        );

    }
);


/* =========================================
   MENU
========================================= */

$('#menuBtn')?.addEventListener(
    'click',
    () => {

        $('#drawer')
            ?.classList
            .add('open');

        $('#backdrop')
            ?.classList
            .remove('hidden');

        $('#drawerBackdrop')
            ?.classList
            .remove('hidden');

    }
);


$('#closeDrawer')
    ?.addEventListener(
        'click',
        closeDrawer
    );


$('#backdrop')
    ?.addEventListener(
        'click',
        closeDrawer
    );


$('#drawerBackdrop')
    ?.addEventListener(
        'click',
        closeDrawer
    );


function closeDrawer() {

    $('#drawer')
        ?.classList
        .remove('open');

    $('#backdrop')
        ?.classList
        .add('hidden');

    $('#drawerBackdrop')
        ?.classList
        .add('hidden');
}


/* =========================================
   QUICK
========================================= */

const quickButton =
    $('#quickBtn') ||
    $('#homeQuick');


if (quickButton) {

    quickButton.addEventListener(
        'click',
        () => {
            go('quick');
        }
    );

}


/* =========================================
   CHAT
========================================= */

async function loadChat() {

    if (!user || !sb) return;


    const {
        data,
        error
    } = await sb
        .from('messages')
        .select(
            'id,body,created_at,user_id'
        )
        .order(
            'created_at',
            {
                ascending: true
            }
        )
        .limit(300);


    if (error) {

        console.error(
            'Erro ao carregar chat:',
            error
        );

        return;
    }


    const ids = [
        ...new Set(
            (data || [])
                .map(
                    x => x.user_id
                )
        )
    ];


    const names = {};


    if (ids.length) {

        const r =
            await sb
                .from('profiles')
                .select(
                    'id,username'
                )
                .in('id', ids);


        (r.data || [])
            .forEach(
                x => {
                    names[x.id] =
                        x.username;
                }
            );
    }


    const container =
        $('#messages');


    if (!container) return;


    container.innerHTML =
        (data || [])
            .map(
                message => {

                    const time =
                        new Date(
                            message.created_at
                        ).toLocaleTimeString(
                            'pt-PT',
                            {
                                hour:
                                    '2-digit',
                                minute:
                                    '2-digit'
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
                                    names[
                                        message.user_id
                                    ] || 'TF'
                                )}
                                ·
                                ${time}
                            </small>

                            <div class="bubble">
                                ${esc(
                                    message.body
                                ).replace(
                                    /\n/g,
                                    '<br>'
                                )}
                            </div>

                        </div>
                    `;

                }
            )
            .join('');
}


/* =========================================
   ENVIAR CHAT
========================================= */

$('#chatForm')?.addEventListener(
    'submit',
    async e => {

        e.preventDefault();


        if (!user || !sb) return;


        const input =
            $('#messageInput');


        const body =
            input?.value.trim();


        if (!body) return;


        if (input) {
            input.disabled = true;
        }


        const { error } =
            await sb
                .from('messages')
                .insert({
                    user_id: user.id,
                    body
                });


        if (input) {
            input.disabled = false;
        }


        if (error) {

            console.error(error);

            showError(
                'Não foi possível enviar a mensagem.'
            );

            return;
        }


        if (input) {

            input.value = '';

            input.focus();

        }


        await loadChat();

    }
);


/* =========================================
   REFERÊNCIAS
========================================= */

async function loadRefs() {

    if (!sb) return;


    const {
        data,
        error
    } = await sb
        .from('references')
        .select('*')
        .order(
            'created_at',
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            'Erro ao carregar referências:',
            error
        );

        return;
    }


    const container =
        $('#referenceGrid');


    if (!container) return;


    const refs =
        data || [];


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

        return;
    }


    container.innerHTML =
        refs
            .map(
                (r, i) => {

                    const image =
                        validUrl(
                            r.image_url
                        );

                    const link =
                        validUrl(
                            r.link_url
                        );


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
                                ${
                                    image
                                        ? ''
                                        : '✦'
                                }
                            </div>

                            <div class="ref-body">

                                <span class="micro">
                                    REF ${String(
                                        i + 1
                                    ).padStart(
                                        2,
                                        '0'
                                    )}
                                </span>

                                <h3>
                                    ${esc(
                                        r.title
                                    )}
                                </h3>

                                <p>
                                    ${esc(
                                        r.note || ''
                                    )}
                                </p>

                                ${
                                    link
                                        ? `
                                            <a
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                href="${esc(
                                                    link
                                                )}"
                                            >
                                                Abrir ↗
                                            </a>
                                        `
                                        : ''
                                }

                            </div>

                        </article>
                    `;

                }
            )
            .join('');
}


/* =========================================
   NOVA REFERÊNCIA
========================================= */

$('#newReference')
    ?.addEventListener(
        'click',
        () => {

            $('#refModal')
                ?.classList
                .remove('hidden');

        }
    );


$$('[data-close]').forEach(
    button => {

        button.addEventListener(
            'click',
            () => {

                const modal =
                    $('#' + button.dataset.close);

                modal
                    ?.classList
                    .add('hidden');

            }
        );

    }
);


/* =========================================
   GUARDAR REFERÊNCIA
========================================= */

$('#refForm')?.addEventListener(
    'submit',
    async e => {

        e.preventDefault();


        if (!user || !sb) return;


        const payload = {

            user_id:
                user.id,

            title:
                $('#refTitle')
                    ?.value
                    .trim(),

            image_url:
                validUrl(
                    $('#refImage')
                        ?.value
                        .trim()
                ) || null,

            link_url:
                validUrl(
                    $('#refLink')
                        ?.value
                        .trim()
                ) || null,

            note:
                $('#refNote')
                    ?.value
                    .trim()
                || null
        };


        if (!payload.title) {

            alert(
                'Escreve um título.'
            );

            return;
        }


        const { error } =
            await sb
                .from('references')
                .insert(
                    payload
                );


        if (error) {

            console.error(
                error
            );

            alert(
                'Não foi possível guardar.'
            );

            return;
        }


        e.target.reset();


        $('#refModal')
            ?.classList
            .add('hidden');


        await loadRefs();

    }
);


/* =========================================
   ESPAÇO PESSOAL — TABS
========================================= */

$$('[data-tab]').forEach(
    button => {

        button.addEventListener(
            'click',
            () => {

                activeTab =
                    button.dataset.tab;


                $$('[data-tab]')
                    .forEach(
                        item => {

                            item.classList.toggle(
                                'active',
                                item.dataset.tab ===
                                    activeTab
                            );

                        }
                    );


                $$('.panel')
                    .forEach(
                        panel => {

                            panel.classList.remove(
                                'active'
                            );

                        }
                    );


                $('#tab-' + activeTab)
                    ?.classList
                    .add('active');


                if (
                    activeTab === 'books' ||
                    activeTab === 'tasks'
                ) {

                    loadPersonal();

                }

            }
        );

    }
);


/* =========================================
   NOTAS
========================================= */

$('#notes')?.addEventListener(
    'input',
    () => {

        clearTimeout(
            noteTimer
        );


        noteTimer =
            setTimeout(
                async () => {

                    if (!user || !sb) {
                        return;
                    }


                    const {
                        error
                    } = await sb
                        .from('notes')
                        .upsert(
                            {
                                user_id:
                                    user.id,

                                body:
                                    $('#notes')
                                        ?.value || '',

                                updated_at:
                                    new Date()
                                        .toISOString()
                            },
                            {
                                onConflict:
                                    'user_id'
                            }
                        );


                    if (error) {

                        console.error(
                            'Erro ao guardar notas:',
                            error
                        );

                    }

                },
                500
            );

    }
);


/* =========================================
   QUICK NOTE
========================================= */

$('#saveQuick')
    ?.addEventListener(
        'click',
        async () => {

            if (!user || !sb) return;


            const {
                error
            } = await sb
                .from('notes')
                .upsert(
                    {
                        user_id:
                            user.id,

                        quick:
                            $('#quickText')
                                ?.value || '',

                        updated_at:
                            new Date()
                                .toISOString()
                    },
                    {
                        onConflict:
                            'user_id'
                    }
                );


            if (error) {

                console.error(
                    error
                );

                return;
            }


            const button =
                $('#saveQuick');


            if (button) {

                button.textContent =
                    'Guardado ✓';


                setTimeout(
                    () => {

                        button.textContent =
                            'Guardar';

                    },
                    1000
                );

            }

        }
    );


/* =========================================
   LIVROS / TAREFAS
========================================= */

async function loadPersonal() {

    if (!user || !sb) return;


    /* NOTAS */

    const n =
        await sb
            .from('notes')
            .select('*')
            .eq(
                'user_id',
                user.id
            )
            .maybeSingle();


    if (n.error) {

        console.error(
            'Erro nas notas:',
            n.error
        );

    }


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


    /* LIVROS */

    const b =
        await sb
            .from('books')
            .select('*')
            .eq(
                'user_id',
                user.id
            )
            .eq(
                'status',
                bookStatus
            )
            .order(
                'created_at',
                {
                    ascending: false
                }
            );


    if (b.error) {

        console.error(
            'Erro nos livros:',
            b.error
        );

    }


    const bookList =
        $('#bookList');


    if (bookList) {

        const books =
            b.data || [];


        bookList.innerHTML =
            books
                .map(
                    book => `

                        <div class="list-item">

                            <span>
                                ${esc(
                                    book.title
                                )}
                            </span>

                            <button
                                type="button"
                                onclick="deleteBook('${esc(
                                    book.id
                                )}')"
                            >
                                ×
                            </button>

                        </div>

                    `
                )
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


    /* TAREFAS */

    const t =
        await sb
            .from('tasks')
            .select('*')
            .eq(
                'user_id',
                user.id
            )
            .order(
                'created_at',
                {
                    ascending: false
                }
            );


    if (t.error) {

        console.error(
            'Erro nas tarefas:',
            t.error
        );

    }


    const taskList =
        $('#taskList');


    if (taskList) {

        const tasks =
            t.data || [];


        taskList.innerHTML =
            tasks
                .map(
                    task => `

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
                                ${esc(
                                    task.title
                                )}
                            </span>

                            <button
                                type="button"
                                onclick="deleteTask(
                                    '${esc(task.id)}'
                                )"
                            >
                                ×
                            </button>

                        </div>

                    `
                )
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


/* =========================================
   FILTRO LIVROS
========================================= */

$$('[data-list]').forEach(
    button => {

        button.addEventListener(
            'click',
            () => {

                $$('.book-tabs button')
                    .forEach(
                        x => {

                            x.classList.remove(
                                'active'
                            );

                        }
                    );


                button.classList.add(
                    'active'
                );


                bookStatus =
                    button.dataset.list;


                loadPersonal();

            }
        );

    }
);


/* =========================================
   MODAL INPUT
========================================= */

function openInput(
    title,
    placeholder,
    mode
) {

    inputMode =
        mode;


    if ($('#inputTitle')) {

        $('#inputTitle')
            .textContent =
            title;

    }


    if ($('#inputValue')) {

        $('#inputValue')
            .placeholder =
            placeholder;

        $('#inputValue')
            .value =
            '';

    }


    $('#inputModal')
        ?.classList
        .remove('hidden');


    setTimeout(
        () => {

            $('#inputValue')
                ?.focus();

        },
        100
    );
}


/* =========================================
   ADICIONAR LIVRO
========================================= */

$('#addBook')
    ?.addEventListener(
        'click',
        () => {

            openInput(
                'Adicionar livro',
                'Nome do livro',
                'book'
            );

        }
    );


/* =========================================
   ADICIONAR TAREFA
========================================= */

$('#addTask')
    ?.addEventListener(
        'click',
        () => {

            openInput(
                'Nova tarefa',
                'O que tens de fazer?',
                'task'
            );

        }
    );


/* =========================================
   GUARDAR LIVRO / TAREFA
========================================= */

$('#inputSave')
    ?.addEventListener(
        'click',
        async () => {

            if (!user || !sb) return;


            const value =
                $('#inputValue')
                    ?.value
                    .trim();


            if (!value) return;


            let result;


            if (inputMode === 'book') {

                result =
                    await sb
                        .from('books')
                        .insert({
                            user_id:
                                user.id,

                            title:
                                value,

                            status:
                                bookStatus
                        });

            } else {

                result =
                    await sb
                        .from('tasks')
                        .insert({
                            user_id:
                                user.id,

                            title:
                                value,

                            done:
                                false
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
                ?.classList
                .add('hidden');


            await loadPersonal();

        }
    );


/* =========================================
   APAGAR LIVRO
========================================= */

window.deleteBook =
    async id => {

        if (!user || !sb) return;


        const {
            error
        } = await sb
            .from('books')
            .delete()
            .eq(
                'id',
                id
            )
            .eq(
                'user_id',
                user.id
            );


        if (error) {

            console.error(
                error
            );

            return;
        }


        await loadPersonal();

    };


/* =========================================
   ALTERAR TAREFA
========================================= */

window.toggleTask =
    async (
        id,
        done
    ) => {

        if (!user || !sb) return;


        const {
            error
        } = await sb
            .from('tasks')
            .update({
                done
            })
            .eq(
                'id',
                id
            )
            .eq(
                'user_id',
                user.id
            );


        if (error) {

            console.error(
                error
            );

            return;
        }


        await loadPersonal();

    };


/* =========================================
   APAGAR TAREFA
========================================= */

window.deleteTask =
    async id => {

        if (!user || !sb) return;


        const {
            error
        } = await sb
            .from('tasks')
            .delete()
            .eq(
                'id',
                id
            )
            .eq(
                'user_id',
                user.id
            );


        if (error) {

            console.error(
                error
            );

            return;
        }


        await loadPersonal();

    };


/* =========================================
   TF MUSIC
========================================= */


/* =========================================
   ABRIR SELEÇÃO
========================================= */

$('#addMusic')
    ?.addEventListener(
        'click',
        () => {

            $('#audioFiles')
                ?.click();

        }
    );


/* =========================================
   SELECIONAR FICHEIROS
========================================= */

$('#audioFiles')
    ?.addEventListener(
        'change',
        async e => {

            const files =
                [...e.target.files];


            if (!files.length) return;


            await uploadMusic(
                files
            );


            e.target.value =
                '';

        }
    );


/* =========================================
   UPLOAD MÚSICA
========================================= */

async function uploadMusic(
    files
) {

    if (!user || !sb) return;


    const button =
        $('#addMusic');


    if (button) {

        button.disabled =
            true;

        button.textContent =
            'A adicionar...';

    }


    try {

        for (const file of files) {

            if (
                !file.type.startsWith(
                    'audio/'
                )
            ) {

                alert(
                    `"${file.name}" não é um ficheiro de áudio.`
                );

                continue;
            }


            const extension =
                file.name.includes('.')
                    ? file.name
                        .split('.')
                        .pop()
                        .toLowerCase()
                    : 'mp3';


            const title =
                file.name
                    .replace(
                        /\.[^/.]+$/,
                        ''
                    )
                    .trim();


            const filePath =
                `${user.id}/${crypto.randomUUID()}.${extension}`;


            const upload =
                await sb.storage
                    .from('tf-music')
                    .upload(
                        filePath,
                        file,
                        {
                            cacheControl:
                                '3600',

                            upsert:
                                false,

                            contentType:
                                file.type
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


            const publicUrl =
                sb.storage
                    .from('tf-music')
                    .getPublicUrl(
                        filePath
                    );


            const {
                error
            } = await sb
                .from('music')
                .insert({
                    user_id:
                        user.id,

                    title:
                        title ||
                        file.name,

                    file_path:
                        filePath,

                    file_url:
                        publicUrl
                            .data
                            .publicUrl
                });


            if (error) {

                console.error(
                    'Erro na BD:',
                    error
                );


                await sb.storage
                    .from('tf-music')
                    .remove([
                        filePath
                    ]);


                alert(
                    `Não foi possível guardar "${file.name}".`
                );

            }

        }


        await loadMusic();


    } catch (error) {

        console.error(
            'Erro no upload:',
            error
        );

        alert(
            'Ocorreu um erro ao adicionar a música.'
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                '+ Adicionar música';

        }

    }
}


/* =========================================
   CARREGAR MÚSICAS
========================================= */

async function loadMusic() {

    if (!user || !sb) return;


    const {
        data,
        error
    } = await sb
        .from('music')
        .select('*')
        .order(
            'created_at',
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            'Erro ao carregar músicas:',
            error
        );

        return;
    }


    tracks =
        data || [];


    if (!tracks.length) {

        audioIndex =
            0;


        const audio =
            $('#audio');


        if (audio) {

            audio.pause();

            audio.removeAttribute(
                'src'
            );

            audio.load();

        }


        if ($('#trackTitle')) {

            $('#trackTitle')
                .textContent =
                'TF playlist';

        }


        if ($('#trackArtist')) {

            $('#trackArtist')
                .textContent =
                'Escolhe música';

        }


        if ($('#musicName')) {

            $('#musicName')
                .textContent =
                'Ainda não existem músicas.';

        }


        if ($('#play')) {

            $('#play')
                .textContent =
                '▶';

        }


        renderMusicList();

        return;
    }


    if (
        audioIndex < 0 ||
        audioIndex >= tracks.length
    ) {

        audioIndex =
            0;

    }


    renderMusicList();

}


/* =========================================
   LISTA DE MÚSICAS
========================================= */

function renderMusicList() {

    const list =
        $('#musicList');


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
        tracks
            .map(
                (track, index) => {

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
                                type="button"
                                class="music-select"
                                data-index="${index}"
                            >

                                <span class="music-number">
                                    ${String(
                                        index + 1
                                    ).padStart(
                                        2,
                                        '0'
                                    )}
                                </span>

                                <span class="music-item-info">

                                    <strong>
                                        ${esc(
                                            track.title
                                        )}
                                    </strong>

                                    <small>
                                        ${esc(
                                            owner
                                        )}
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
                                            type="button"
                                            class="music-delete"
                                            data-id="${esc(
                                                track.id
                                            )}"
                                        >
                                            ×
                                        </button>
                                    `
                                    : ''
                            }

                        </div>
                    `;

                }
            )
            .join('');


    list
        .querySelectorAll(
            '.music-select'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        const index =
                            Number(
                                button.dataset.index
                            );

                        selectTrack(
                            index
                        );

                    }
                );

            }
        );


    list
        .querySelectorAll(
            '.music-delete'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        deleteMusic(
                            button.dataset.id
                        );

                    }
                );

            }
        );

}


/* =========================================
   SELECCIONAR MÚSICA
========================================= */

function selectTrack(index) {

    if (!tracks[index]) return;


    audioIndex =
        index;


    const track =
        tracks[audioIndex];


    const audio =
        $('#audio');


    if (!audio) return;


    const source =
        validUrl(
            track.file_url
        );


    if (!source) {

        console.error(
            'URL de música inválido:',
            track.file_url
        );

        return;
    }


    audio.src =
        source;


    audio.load();


    if ($('#trackTitle')) {

        $('#trackTitle')
            .textContent =
            track.title;

    }


    if ($('#trackArtist')) {

        $('#trackArtist')
            .textContent =
            track.user_id === user.id
                ? 'Adicionada por ti'
                : 'Adicionada pela outra pessoa';

    }


    if ($('#musicName')) {

        $('#musicName')
            .textContent =
            track.title;

    }


    renderMusicList();


    audio
        .play()
        .then(
            () => {

                if ($('#play')) {

                    $('#play')
                        .textContent =
                        'Ⅱ';

                }

            }
        )
        .catch(
            error => {

                console.warn(
                    'Autoplay bloqueado:',
                    error
                );

            }
        );

}


/* =========================================
   PLAY / PAUSE
========================================= */

$('#play')
    ?.addEventListener(
        'click',
        async () => {

            const audio =
                $('#audio');


            if (
                !audio ||
                !audio.src
            ) {
                return;
            }


            try {

                if (audio.paused) {

                    await audio.play();

                    $('#play')
                        .textContent =
                        'Ⅱ';

                } else {

                    audio.pause();

                    $('#play')
                        .textContent =
                        '▶';

                }

            } catch (error) {

                console.error(
                    'Erro no player:',
                    error
                );

            }

        }
    );


/* =========================================
   PLAYER EVENTS
========================================= */

$('#audio')
    ?.addEventListener(
        'play',
        () => {

            if ($('#play')) {

                $('#play')
                    .textContent =
                    'Ⅱ';

            }

        }
    );


$('#audio')
    ?.addEventListener(
        'pause',
        () => {

            if ($('#play')) {

                $('#play')
                    .textContent =
                    '▶';

            }

        }
    );


/* =========================================
   ANTERIOR
========================================= */

$('#prev')
    ?.addEventListener(
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


            selectTrack(
                audioIndex
            );

        }
    );


/* =========================================
   PRÓXIMA
========================================= */

$('#next')
    ?.addEventListener(
        'click',
        () => {

            if (!tracks.length) return;


            audioIndex =
                (
                    audioIndex +
                    1
                ) %
                tracks.length;


            selectTrack(
                audioIndex
            );

        }
    );


/* =========================================
   MÚSICA TERMINOU
========================================= */

$('#audio')
    ?.addEventListener(
        'ended',
        () => {

            if (!tracks.length) return;

            if ($('#next')) {

                $('#next').click();

            }

        }
    );


/* =========================================
   PROGRESSO
========================================= */

$('#audio')
    ?.addEventListener(
        'timeupdate',
        () => {

            const audio =
                $('#audio');

            const progress =
                $('#progress');


            if (
                !audio ||
                !progress ||
                !audio.duration ||
                !Number.isFinite(
                    audio.duration
                )
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


/* =========================================
   APAGAR MÚSICA
========================================= */

async function deleteMusic(id) {

    if (!user || !sb) return;


    const track =
        tracks.find(
            item =>
                item.id === id
        );


    if (!track) return;


    const confirmed =
        confirm(
            `Queres apagar "${track.title}"?`
        );


    if (!confirmed) return;


    /* BD primeiro */

    const {
        error: databaseError
    } = await sb
        .from('music')
        .delete()
        .eq(
            'id',
            id
        )
        .eq(
            'user_id',
            user.id
        );


    if (databaseError) {

        console.error(
            databaseError
        );

        alert(
            'Não foi possível apagar a música.'
        );

        return;
    }


    /* Storage */

    if (track.file_path) {

        const {
            error: storageError
        } = await sb.storage
            .from('tf-music')
            .remove([
                track.file_path
            ]);


        if (storageError) {

            console.warn(
                'A música foi removida da BD, mas o ficheiro ficou no Storage:',
                storageError
            );

        }

    }


    const audio =
        $('#audio');


    if (audio) {

        audio.pause();

        audio.removeAttribute(
            'src'
        );

        audio.load();

    }


    audioIndex =
        0;


    await loadMusic();

}


/* =========================================
   CARREGAR TUDO
========================================= */

async function loadAll() {

    await Promise.all([
        loadChat(),
        loadRefs(),
        loadPersonal(),
        loadMusic()
    ]);

}


/* =========================================
   REALTIME
========================================= */

function subscribeRealtime() {

    if (
        !sb ||
        realtimeChannel
    ) {
        return;
    }


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
                () => {
                    loadChat();
                }
            )

            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'references'
                },
                () => {
                    loadRefs();
                }
            )

            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notes'
                },
                () => {
                    loadPersonal();
                }
            )

            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'books'
                },
                () => {
                    loadPersonal();
                }
            )

            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks'
                },
                () => {
                    loadPersonal();
                }
            )

            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'music'
                },
                () => {
                    loadMusic();
                }
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


/* =========================================
   TESTE SUPABASE
========================================= */

async function testSupabase() {

    if (!sb) return;


    console.log(
        'A testar Supabase...'
    );


    const {
        data,
        error
    } = await sb
        .from('profiles')
        .select(
            'id, username'
        )
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


/* =========================================
   START
========================================= */

boot();

testSupabase();
