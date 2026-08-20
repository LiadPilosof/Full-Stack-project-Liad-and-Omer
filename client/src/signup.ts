import { createClient } from '@supabase/supabase-js';

// 1. Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Grab the HTML elements
const signupForm = document.getElementById('signup-form') as HTMLFormElement;
const fullNameInput = document.getElementById('fullName') as HTMLInputElement;
const emailInput = document.getElementById('email') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
const companyInput = document.getElementById('company') as HTMLInputElement;
const termsInput = document.getElementById('terms') as HTMLInputElement;
const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
const messageDisplay = document.getElementById('message') as HTMLParagraphElement;

function getSelectedRole(): string {
    const checked = document.querySelector('input[name="role"]:checked') as HTMLInputElement | null;
    return checked ? checked.value : 'worker';
}

// 3. Handle the form submission
signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const company = companyInput.value.trim();
    const role = getSelectedRole();

    // Client-side validation
    if (password !== confirmPassword) {
        messageDisplay.style.color = 'red';
        messageDisplay.textContent = 'Passwords do not match.';
        return;
    }

    if (!termsInput.checked) {
        messageDisplay.style.color = 'red';
        messageDisplay.textContent = 'You must agree to the Terms of Service to continue.';
        return;
    }

    submitBtn.disabled = true;
    messageDisplay.style.color = 'blue';
    messageDisplay.textContent = 'Creating account...';

    // 4. Send the data to Supabase, including extra profile fields as user metadata
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: fullName,
                company: company,
                role: role,
            },
        },
    });

    // 5. Display the result to the user
    if (error) {
        messageDisplay.style.color = 'red';
        messageDisplay.textContent = `Error: ${error.message}`;
        submitBtn.disabled = false;
    } else {
        messageDisplay.style.color = 'green';
        messageDisplay.textContent = 'Success! Check your email to confirm your account.';
        signupForm.reset();
        submitBtn.disabled = false;
    }
});