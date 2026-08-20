import { createClient } from '@supabase/supabase-js';

//ignore the error about process.env not being defined, it is defined in the .env file and will be replaced by Vite during the build process
const supabaseUrl = process.env.SUPABASE_URL as string; 
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Grab the HTML elements
const signupForm = document.getElementById('signup-form') as HTMLFormElement;
const emailInput = document.getElementById('email') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const messageDisplay = document.getElementById('message') as HTMLParagraphElement;

// 3. Handle the form submission
signupForm.addEventListener('submit', async (event) => {
    // Prevent the page from refreshing when the form is submitted
    event.preventDefault(); 
    
    const email = emailInput.value;
    const password = passwordInput.value;

    messageDisplay.style.color = 'blue';
    messageDisplay.textContent = 'Creating account...';

    // 4. Send the data to Supabase
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    // 5. Display the result to the user
    if (error) {
        messageDisplay.style.color = 'red';
        messageDisplay.textContent = `Error: ${error.message}`;
    } else {
        messageDisplay.style.color = 'green';
        messageDisplay.textContent = 'Success! Check your email to confirm your account.';
        signupForm.reset();
    }
});