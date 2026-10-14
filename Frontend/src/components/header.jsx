import sintaxLogo from '../assets/sintax-logo.png';

function Header() {
    return (
        <header className="app-header">
            <div className="header-left">
                <img src={sintaxLogo} alt="Sintax Logo" className="header-logo" />
            </div>

            <div className="header-right">
                <span className="secure-dot"></span>
                <span>Conexión Segura</span>
            </div>
        </header>
    );
}

export default Header;