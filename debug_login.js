
import { createClient } from '@supabase/supabase-js';

const url = 'https://joqjptzlrhhrwdkunmjh.supabase.co';
const key = 'sb_publishable_S2i-0PG8LcbK4j6z3RT23A_7XPSn486';
const supabase = createClient(url, key);

async function testLogin() {
    console.log('Tentando login com jotajoao29@gmail.com ...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'jotajoao29@gmail.com',
        password: 'gg8754070302'
    });

    if (error) {
        console.error('ERRO DE LOGIN:', error.message);
        console.error('Detalhes:', error);
    } else {
        console.log('LOGIN SUCESSO!');
        console.log('User ID:', data.user.id);

        // Check Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error('Erro ao buscar perfil:', profileError);
        } else {
            console.log('Perfil encontrado:', profile);
        }
    }
}

testLogin();
