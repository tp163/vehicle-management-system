function setLoginType(type) {
    const title = document.getElementById('loginTitle');
    const loginForm = document.getElementById('loginForm');

    if (title) {
        title.innerText = type + " Login";
    }

    if (loginForm) {
        loginForm.dataset.type = type;
    }

    updateCustomerAuthUI();
}

function setCustomerAuthFlow(mode) {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        return;
    }

    loginForm.dataset.customerFlow = mode === 'book' ? 'book' : 'login';
    updateCustomerAuthUI();
}

function updateCustomerAuthUI() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        return;
    }

    const type = loginForm.dataset.type || 'Customer';
    const flow = loginForm.dataset.customerFlow || 'login';
    const registerFields = document.getElementById('customerRegisterFields');
    const submitButton = document.getElementById('authSubmitButton');

    if (!registerFields || !submitButton) {
        return;
    }

    const showRegisterFields = type === 'Customer' && flow === 'book';
    registerFields.classList.toggle('d-none', !showRegisterFields);
    submitButton.textContent = type === 'Admin' ? 'Admin Sign In' : (showRegisterFields ? 'Continue to Booking' : 'Sign In');
}

async function parseApiResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();
    let data = null;

    if (responseText) {
        if (contentType.includes('application/json')) {
            try {
                data = JSON.parse(responseText);
            } catch (error) {
                data = null;
            }
        } else {
            try {
                data = JSON.parse(responseText);
            } catch (error) {
                data = null;
            }
        }
    }

    if (!response.ok) {
        const htmlLikeResponse = responseText.trim().startsWith('<');
        const message = (data && (data.message || data.error))
            || (htmlLikeResponse ? 'Server returned HTML instead of JSON. Check that API backend is running at http://localhost:3000.' : `Request failed (${response.status})`);
        throw new Error(message);
    }

    if (!data) {
        throw new Error('Invalid server response format.');
    }

    return data;
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        if (!loginForm.dataset.type) {
            loginForm.dataset.type = 'Customer';
        }
        if (!loginForm.dataset.customerFlow) {
            loginForm.dataset.customerFlow = 'login';
        }
        updateCustomerAuthUI();

        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const type = this.dataset.type || "Customer";
            const customerFlow = this.dataset.customerFlow || 'login';
            const emailInput = document.getElementById('authEmail').value.trim();
            const passwordInput = document.getElementById('authPassword').value;

            if (type === "Admin") {
                if (emailInput === "admin@vsms.com" && passwordInput === "admin123") {
                    window.location.href = "admin/HTML/dashboard.html";
                } else {
                    alert("Invalid Admin Credentials!");
                }
                return;
            }

            const fullName = (document.getElementById('authFullName')?.value || '').trim();
            const phone = (document.getElementById('authPhone')?.value || '').trim();
            const address = (document.getElementById('authAddress')?.value || '').trim();

            if (customerFlow === 'book' && (!fullName || !phone)) {
                alert('For new customer booking, please enter Full Name and Phone Number.');
                return;
            }

            fetch('http://localhost:3000/api/customer-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailInput,
                    password: passwordInput,
                    full_name: fullName,
                    phone: phone,
                    address: address
                })
            })
            .then(parseApiResponse)
            .then(data => {
                if (!data.user) {
                    throw new Error('Unable to authenticate customer');
                }

                const welcomePrefix = data.created ? 'Registration Successful! Welcome ' : 'Login Successful! Welcome ';
                alert(welcomePrefix + data.user.full_name);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                window.location.href = 'customer/customer-dashboard.html';
            })
            .catch(err => {
                console.error('Customer Auth Error:', err);
                alert(err.message === 'Failed to fetch' ? 'Server is offline!' : err.message);
            });
        });
    }

    const assistantWidget = document.querySelector('.assistant-widget');

    if (!assistantWidget) {
        return;
    }

    const assistantPanel = assistantWidget.querySelector('#assistantPanel');
    const assistantToggle = assistantWidget.querySelector('#assistantToggle');
    const assistantClose = assistantWidget.querySelector('#assistantClose');
    const assistantMessages = assistantWidget.querySelector('#assistantMessages');
    const assistantForm = assistantWidget.querySelector('#assistantForm');
    const assistantInput = assistantWidget.querySelector('#assistantInput');
    const assistantChips = assistantWidget.querySelectorAll('[data-assistant-question]');

    function scrollAssistantToBottom() {
        assistantMessages.scrollTop = assistantMessages.scrollHeight;
    }

    function addAssistantMessage(text, author) {
        const messageRow = document.createElement('div');
        messageRow.className = author === 'user'
            ? 'assistant-message assistant-message-user'
            : 'assistant-message assistant-message-bot';

        const messageBubble = document.createElement('div');
        messageBubble.className = 'assistant-message-bubble shadow-sm';
        messageBubble.textContent = text;

        messageRow.appendChild(messageBubble);
        assistantMessages.appendChild(messageRow);
        scrollAssistantToBottom();
    }

    function normalizeQuery(text) {
        return text.toLowerCase().trim();
    }

    function buildResponse(message) {
        const query = normalizeQuery(message);

        if (query.includes('service') || query.includes('type of service') || query.includes('what do you do')) {
            return 'We currently offer oil and filter changes, brake inspections, vehicle diagnostics, full service checks, and roadside assistance. I can also point you to pricing, spare parts, and booking details.';
        }

        if (query.includes('charge') || query.includes('price') || query.includes('cost') || query.includes('pricing')) {
            return 'Standard pricing shown on the homepage: Basic Check - 4,900 and Full Service - 10,000. For exact repair or parts pricing, contact the workshop with your vehicle details.';
        }

        if (query.includes('spare') || query.includes('part') || query.includes('buy') || query.includes('available')) {
            return 'Common spare parts you can ask for include engine oil, oil filters, air filters, brake pads, brake discs, spark plugs, batteries, belts, wiper blades, coolant, and tires. Stock can vary, so contact us for availability.';
        }

        if (query.includes('hour') || query.includes('open') || query.includes('day') || query.includes('working')) {
            return 'Working hours: Monday to Saturday, 8:00 AM to 6:00 PM. Open days: Monday through Saturday. Sunday is closed except for emergency roadside support.';
        }

        if (query.includes('contact') || query.includes('phone') || query.includes('call') || query.includes('hotline')) {
            return 'General contact: +1 234 567 890. Emergency hotline: +94 11 234 5678. Address: 123 Garage Lane, Auto City.';
        }

        if (query.includes('email') || query.includes('mail')) {
            return 'You can email the team at support@vsms.com for bookings, service questions, or spare part requests.';
        }

        if (query.includes('book') || query.includes('appointment') || query.includes('schedule')) {
            return 'Use the Book a Service button on the homepage to request an appointment. If you are already a customer, log in first so we can track your service history.';
        }

        if (query.includes('location') || query.includes('address') || query.includes('where')) {
            return 'Main contact point: 123 Garage Lane, Auto City. The map section on the homepage shows the service area around Colombo.';
        }

        return 'I can help with services, charges, spare parts, open days, working hours, contacts, emails, or booking. Try one of the quick buttons below.';
    }

    function handleAssistantSubmit(question) {
        const trimmedQuestion = question.trim();

        if (!trimmedQuestion) {
            return;
        }

        addAssistantMessage(trimmedQuestion, 'user');
        window.setTimeout(function() {
            addAssistantMessage(buildResponse(trimmedQuestion), 'bot');
        }, 250);
    }

    function openAssistant() {
        assistantPanel.classList.remove('d-none');
        assistantToggle.setAttribute('aria-expanded', 'true');
        assistantInput.focus();
    }

    function closeAssistant() {
        assistantPanel.classList.add('d-none');
        assistantToggle.setAttribute('aria-expanded', 'false');
    }

    assistantToggle.addEventListener('click', function() {
        const isHidden = assistantPanel.classList.contains('d-none');

        if (isHidden) {
            openAssistant();
        } else {
            closeAssistant();
        }
    });

    assistantClose.addEventListener('click', closeAssistant);

    assistantForm.addEventListener('submit', function(event) {
        event.preventDefault();
        handleAssistantSubmit(assistantInput.value);
        assistantInput.value = '';
    });

    assistantChips.forEach(function(chip) {
        chip.addEventListener('click', function() {
            handleAssistantSubmit(this.dataset.assistantQuestion || this.textContent);
        });
    });

    addAssistantMessage('Hi, I am the CSC Service Assistant. Ask me about services, pricing, spare parts, opening hours, contacts, emails, or booking.', 'bot');
});